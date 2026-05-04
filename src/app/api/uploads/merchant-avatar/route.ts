import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mkdir, readdir, stat, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

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
      return NextResponse.json(
        { error: "Type de fichier non supporté (jpg, png, webp, gif)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image trop lourde (max 5MB)" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "merchants");
    await mkdir(uploadDir, { recursive: true });

    const ext = extensionFromType(file.type);
    const filename = `${session.user.id}-${randomUUID()}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativeUrl = `/uploads/merchants/${encodeURIComponent(filename)}`;
    const origin = new URL(request.url).origin;

    return NextResponse.json({
      url: relativeUrl,
      absoluteUrl: `${origin}${relativeUrl}`,
      filename,
    });
  } catch (error) {
    console.error("Merchant avatar upload error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "merchants");
    await mkdir(uploadDir, { recursive: true });

    const files = await readdir(uploadDir);
    const filtered = files
      .filter((filename) => {
        const lower = filename.toLowerCase();
        const hasValidExt = Array.from(ALLOWED_EXTENSIONS).some((ext) => lower.endsWith(ext));
        return hasValidExt && (!search || lower.includes(search));
      })
      .slice(0, limit);

    const items = await Promise.all(
      filtered.map(async (filename) => {
        const filePath = path.join(uploadDir, filename);
        const info = await stat(filePath);
        const url = `/uploads/merchants/${encodeURIComponent(filename)}`;
        return {
          filename,
          url,
          absoluteUrl: `${new URL(request.url).origin}${url}`,
          updatedAt: info.mtime.toISOString(),
        };
      })
    );

    items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Merchant avatar list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
