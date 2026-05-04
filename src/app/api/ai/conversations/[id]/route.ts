import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await params;

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("AI conversation detail error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
