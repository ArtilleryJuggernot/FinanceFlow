import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Type non supporté" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image trop lourde (max 5MB)" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "transactions");
    await mkdir(uploadDir, { recursive: true });

    const ext = extensionFromType(file.type);
    const filename = `${session.user.id}-${randomUUID()}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/transactions/${filename}`;
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      url: relativeUrl,
      absoluteUrl: `${origin}${relativeUrl}`,
      filename,
    });
  } catch (error) {
    console.error("Transaction photo upload error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
