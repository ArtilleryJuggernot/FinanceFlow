import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      include: {
        bankConnection: {
          select: { institutionName: true, status: true, expiresAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Accounts error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("checking"),
  currency: z.string().default("EUR"),
  balance: z.number().default(0),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const data = createAccountSchema.parse(body);

    const account = await prisma.account.create({
      data: {
        ...data,
        userId: session.user.id,
        isManual: true,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.account.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
