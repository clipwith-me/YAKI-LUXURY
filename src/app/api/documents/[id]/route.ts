import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { toActor } from "@/server/action";
import { readDocumentForActor } from "@/server/services/documents";
import { DomainError } from "@/server/errors";

/** Private document download: owner partner or authorised staff only. Never cached by shared caches. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try {
    const { doc, data } = await readDocumentForActor(user ? toActor(user) : null, (await params).id);
    const safeName = doc.fileName.replace(/[^\w.\- ]/g, "_");
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": doc.mimeType, "Content-Disposition": `attachment; filename="${safeName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    const status = err instanceof DomainError && err.code === "FORBIDDEN" ? 403 : 404;
    return NextResponse.json({ error: status === 403 ? "Not allowed" : "Not found" }, { status });
  }
}
