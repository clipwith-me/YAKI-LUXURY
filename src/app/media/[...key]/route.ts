import { NextResponse } from "next/server";
import { storage } from "@/server/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves PUBLIC uploaded listing photos only. Private documents live under a different prefix. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = key.join("/");
  if (key[0] !== "public" || !/^public\/\d{4}-\d{2}\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(path)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await storage().get(path);
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": TYPES[path.split(".").pop()!]!, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
