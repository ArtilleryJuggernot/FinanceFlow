import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const executions = await prisma.aiActionExecution.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(executions);
  } catch (error) {
    console.error("AI executions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
