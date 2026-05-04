import { auth } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function getUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads", "merchants");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Non autorisé", { status: 401 });
    }

    const { filename: rawParam } = await params;
    const filename = path.basename(decodeURIComponent(rawParam));
    const filePath = path.join(getUploadDir(), filename);
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
