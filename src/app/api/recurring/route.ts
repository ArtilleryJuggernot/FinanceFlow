import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const groups = await prisma.recurringGroup.findMany({
      where: { userId: session.user.id },
      include: { category: true },
      orderBy: { estimatedAmount: "desc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Recurring groups error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
