import { randomBytes } from "node:crypto";

// Crockford-style alphabet without ambiguous characters (0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Cryptographically random, non-sequential public code. */
export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function propertyReference(): string {
  return `YLP-${randomCode(6)}`;
}

export function formatLeadCode(year: number, sequence: number): string {
  return `YLH-${year}-${String(sequence).padStart(5, "0")}`;
}
