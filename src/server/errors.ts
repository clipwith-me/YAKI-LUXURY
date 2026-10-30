/**
 * Domain errors carry a stable code and a message that is SAFE to show to users.
 * Anything else is treated as an internal error and replaced with a generic message.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_STATE";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const forbidden = (msg = "You don't have permission to do that.") => new DomainError("FORBIDDEN", msg);
export const notFound = (msg = "We couldn't find what you were looking for.") => new DomainError("NOT_FOUND", msg);
export const invalidState = (msg: string) => new DomainError("INVALID_STATE", msg);

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; code: ErrorCode | "INTERNAL"; fieldErrors?: Record<string, string[] | undefined>; requestId?: string };

/** Converts any thrown value into a client-safe ActionResult. Logs internals server-side only. */
export function toActionError(err: unknown): Extract<ActionResult, { ok: false }> {
  if (err instanceof DomainError) {
    return { ok: false, error: err.message, code: err.code, fieldErrors: err.fieldErrors };
  }
  // Next.js uses thrown errors for redirect()/notFound(); never swallow them.
  if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string") {
    const digest = (err as { digest: string }).digest;
    if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")) throw err;
  }
  const requestId = crypto.randomUUID();
  console.error(JSON.stringify({ level: "error", requestId, msg: "Unhandled action error", error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) }));
  return { ok: false, error: "Something went wrong on our side. Please try again.", code: "INTERNAL", requestId };
}
