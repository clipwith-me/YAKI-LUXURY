import { createHash, createHmac, randomBytes } from "node:crypto";

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set (32+ chars) in production");
    return "insecure-development-secret";
  }
  return secret;
}

/** Keyed hash for anonymous identifiers (visitor cookie) — not reversible without APP_SECRET. */
export function keyedHash(value: string): string {
  return createHmac("sha256", appSecret()).update(value).digest("hex").slice(0, 32);
}
