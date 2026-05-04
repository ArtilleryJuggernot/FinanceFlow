import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  actionKey: z.string().min(1),
  allowed: z.boolean(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const items = await prisma.aiPermission.findMany({
      where: { userId: session.user.id },
      orderBy: { actionKey: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("AI permissions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const payload = schema.parse(await request.json());

    const updated = await prisma.aiPermission.upsert({
      where: {
        userId_actionKey: {
          userId: session.user.id,
          actionKey: payload.actionKey,
        },
      },
      update: { allowed: payload.allowed },
      create: {
        userId: session.user.id,
        actionKey: payload.actionKey,
        allowed: payload.allowed,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("AI permissions update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
