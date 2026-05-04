import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { question } = (await request.json()) as { question?: string };
    if (!question) {
      return NextResponse.json({ error: "Question requise" }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        answer:
          "OpenRouter n'est pas encore configuré côté serveur. Ajoute OPENROUTER_API_KEY dans .env pour activer l'assistant.",
      });
    }

    return NextResponse.json({
      answer:
        "L'intégration complète OpenRouter + exécution d'actions MCP internes est en cours. Cette v1 prépare l'interface IA et les endpoints.",
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
