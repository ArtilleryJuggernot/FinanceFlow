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

    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1).default("tag"),
  color: z.string().min(1).default("#6b7280"),
  type: z.enum(["income", "expense"]).default("expense"),
  parentId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = createCategorySchema.parse(await request.json());
    const created = await prisma.category.create({
      data: {
        name: payload.name,
        icon: payload.icon,
        color: payload.color,
        type: payload.type,
        parentId: payload.parentId ?? null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]).optional(),
  parentId: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = updateCategorySchema.parse(await request.json());
    const { id, ...data } = payload;

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update category error:", error);
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

    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
