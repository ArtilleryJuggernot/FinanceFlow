import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const merchantName = searchParams.get("merchantName");
    if (!merchantName) {
      return NextResponse.json({ error: "merchantName requis" }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: session.user.id },
        merchantName: { contains: merchantName },
      },
      include: {
        account: { select: { name: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Recurring merchant transactions error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
