import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActionByKey, getActionRegistry } from "@/lib/ai/action-registry";

type AssistantPayload = {
  question?: string;
  conversationId?: string;
};

function inferActionFromQuestion(question: string): string | null {
  const q = question.toLowerCase();
  if (q.includes("résumé") || q.includes("bilan") || q.includes("mois")) {
    return "dashboard.summary";
  }
  if (q.includes("derni") || q.includes("latest")) {
    return "transactions.latest";
  }
  if (q.includes("marchand") || q.includes("merchant") || q.includes("top")) {
    return "merchant.top";
  }
  return null;
}

async function getPermission(userId: string, actionKey: string) {
  const existing = await prisma.aiPermission.findUnique({
    where: {
      userId_actionKey: {
        userId,
        actionKey,
      },
    },
  });
  if (!existing) {
    return prisma.aiPermission.create({
      data: { userId, actionKey, allowed: true },
    });
  }
  return existing;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { question, conversationId } = (await request.json()) as AssistantPayload;
    if (!question) {
      return NextResponse.json({ error: "Question requise" }, { status: 400 });
    }

    const conversation =
      conversationId &&
      (await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
      }));

    const ensuredConversation =
      conversation ||
      (await prisma.aiConversation.create({
        data: {
          userId: session.user.id,
          title: question.slice(0, 60),
        },
      }));

    await prisma.aiMessage.create({
      data: {
        conversationId: ensuredConversation.id,
        role: "user",
        content: question,
      },
    });

    const selectedActionKey = inferActionFromQuestion(question);
    let actionResult: unknown = null;
    let actionError: string | null = null;

    if (selectedActionKey) {
      const permission = await getPermission(session.user.id, selectedActionKey);
      if (permission.allowed) {
        const action = getActionByKey(selectedActionKey);
        if (action) {
          try {
            actionResult = await action.handler({ userId: session.user.id, params: {} });
          } catch (e) {
            actionError = e instanceof Error ? e.message : "Action failed";
          }
        }
      } else {
        actionError = "Permission refusée pour cette action.";
      }

      await prisma.aiActionExecution.create({
        data: {
          userId: session.user.id,
          conversationId: ensuredConversation.id,
          actionKey: selectedActionKey,
          parameters: {},
          result: actionResult as object | undefined,
          success: !actionError,
          error: actionError,
        },
      });
    }

    let answer = "Je n'ai pas identifié d'action exécutable. Reformule avec un objectif précis.";
    if (selectedActionKey && actionResult && !actionError) {
      answer = `Action exécutée: ${selectedActionKey}\n\n\`\`\`json\n${JSON.stringify(actionResult, null, 2)}\n\`\`\``;
    } else if (actionError) {
      answer = `Action ${selectedActionKey} en erreur: ${actionError}`;
    } else if (!process.env.OPENROUTER_API_KEY) {
      answer =
        "OpenRouter n'est pas encore configuré côté serveur. Ajoute OPENROUTER_API_KEY dans .env pour activer les réponses LLM.";
    } else {
      const registry = getActionRegistry()
        .map((a) => `- ${a.key}: ${a.description}`)
        .join("\n");
      answer = `Aucune action déterministe trouvée. Actions disponibles:\n${registry}`;
    }

    await prisma.aiMessage.create({
      data: {
        conversationId: ensuredConversation.id,
        role: "assistant",
        content: answer,
      },
    });

    return NextResponse.json({
      conversationId: ensuredConversation.id,
      answer,
      selectedActionKey,
      actionResult,
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
