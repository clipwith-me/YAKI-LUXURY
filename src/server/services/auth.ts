import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { DomainError } from "@/server/errors";
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from "@/server/validation/common";

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  password: passwordSchema,
  marketingOptIn: z.boolean().default(false),
});

/** Customer self-registration. Role is always CUSTOMER — never taken from input. */
export async function registerCustomer(input: z.input<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    throw new DomainError("CONFLICT", "An account with this email already exists. Try signing in.", { email: ["Already registered"] });
  }
  const passwordHash = await hashPassword(data.password);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, name: data.name, phone: data.phone, passwordHash, role: "CUSTOMER" } });
    // Link any guest enquiries made with this email so the customer sees their history.
    const existing = await tx.customer.findUnique({ where: { email: data.email } });
    if (existing && !existing.userId) {
      await tx.customer.update({ where: { id: existing.id }, data: { userId: user.id, marketingOptIn: data.marketingOptIn } });
    } else if (!existing) {
      await tx.customer.create({ data: { userId: user.id, email: data.email, fullName: data.name, phone: data.phone, marketingOptIn: data.marketingOptIn } });
    }
    return user;
  });
}

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });

/** Returns the user on success. Uses one generic error so attackers can't enumerate accounts. */
export async function authenticate(input: z.input<typeof loginSchema>) {
  const data = loginSchema.parse(input);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const ok = await verifyPassword(data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok || user.deletedAt) throw new DomainError("UNAUTHENTICATED", "Email or password is incorrect.");
  if (user.status !== "ACTIVE") throw new DomainError("FORBIDDEN", "This account is not active. Please contact support.");
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

export async function setUserStatus(actorId: string, userId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") {
  const before = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!before) throw new DomainError("NOT_FOUND", "User not found.");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status } });
    // Suspension takes effect immediately: kill every live session.
    if (status !== "ACTIVE") await tx.session.deleteMany({ where: { userId } });
    await audit({ actorId, action: `user.${status.toLowerCase()}`, entityType: "User", entityId: userId, before, after: { status } }, tx);
  });
}
