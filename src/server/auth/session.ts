import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRole } from "@prisma/client";
import { db } from "@/server/db";
import { newSessionToken, sha256 } from "./tokens";

export const SESSION_COOKIE = "ylh_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Only touch lastSeenAt occasionally so every request doesn't write.
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  partnerIds: string[];
};

export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user once per request. Suspended/deleted users have no session. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          deletedAt: true,
          partnerMemberships: { select: { partnerId: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  if (user.status !== "ACTIVE" || user.deletedAt) return null;
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    partnerIds: user.partnerMemberships.map((m) => m.partnerId),
  };
});
