import "server-only";
import { getSessionUser, type SessionUser } from "@/server/auth/session";
import { DomainError, toActionError, type ActionResult } from "@/server/errors";
import type { Actor } from "@/server/authz/policies";

export function toActor(user: SessionUser): Actor {
  return { id: user.id, role: user.role, partnerIds: user.partnerIds };
}

/**
 * Wraps a server action: resolves the signed-in actor, runs the service call and converts any
 * error into a client-safe ActionResult. Controllers stay thin — all rules live in services.
 */
export async function authed<T>(fn: (actor: Actor, user: SessionUser) => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const user = await getSessionUser();
    if (!user) throw new DomainError("UNAUTHENTICATED", "Please sign in to continue.");
    const data = await fn(toActor(user), user);
    return { ok: true, data, message };
  } catch (err) {
    return toActionError(err);
  }
}

export async function publicAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (err) {
    return toActionError(err);
  }
}
