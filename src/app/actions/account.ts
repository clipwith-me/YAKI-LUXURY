"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { authed } from "@/server/action";
import { deleteAlert } from "@/server/services/customers";
import { markNotificationsRead } from "@/server/notifications/notify";
import { nameSchema, phoneSchema } from "@/server/validation/common";
import type { ActionResult } from "@/server/errors";

export async function deleteAlertAction(form: FormData): Promise<void> {
  await authed(async (actor) => deleteAlert(actor, String(form.get("id"))));
  revalidatePath("/account/alerts");
}

export async function markAllReadAction(form: FormData): Promise<void> {
  await authed(async (actor) => markNotificationsRead(actor.id));
  revalidatePath(String(form.get("path") ?? "/"));
}

const profileSchema = z.object({ name: nameSchema, phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)), marketingOptIn: z.boolean() });

export async function updateProfileAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (actor) => {
    const data = profileSchema.parse({ name: form.get("name"), phone: form.get("phone") ?? "", marketingOptIn: form.get("marketingOptIn") === "on" });
    // Only the caller's own record; role/status/email are never accepted from this form.
    await db.user.update({ where: { id: actor.id }, data: { name: data.name, phone: data.phone ?? null } });
    await db.customer.updateMany({ where: { userId: actor.id }, data: { fullName: data.name, marketingOptIn: data.marketingOptIn, ...(data.phone ? { phone: data.phone } : {}) } });
  }, "Profile updated.");
}
