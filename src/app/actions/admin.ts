"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DocumentStatus, FlagStatus, LeadStatus, PartnerStatus, ReviewStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { authed } from "@/server/action";
import { audit } from "@/server/audit";
import { assertPermission } from "@/server/authz/policies";
import { STAFF_ROLES } from "@/server/authz/permissions";
import { hashPassword } from "@/server/auth/password";
import { DomainError, forbidden, type ActionResult } from "@/server/errors";
import { formToObject, emailSchema, nameSchema, passwordSchema } from "@/server/validation/common";
import { reviewProperty, updateListingControls } from "@/server/services/properties";
import { setPartnerStatus, createAgreement, setAgreementStatus, updatePartnerInternalNotes } from "@/server/services/partners";
import { updateLeadStatus, assignLead, introduceLeadToPartner } from "@/server/services/leads";
import { transitionCommission, recordCommissionPayment, adjustCommission } from "@/server/services/commissions";
import { createVerification, setVerificationStatus } from "@/server/services/verification";
import { resolveFlag, flagByStaff } from "@/server/services/risk";
import { reviewDocument } from "@/server/services/documents";
import { moderateReview } from "@/server/services/reviews";
import { saveArticle } from "@/server/services/articles";
import { updateSetting, settingSchemas, type SettingKey } from "@/server/settings";
import { setUserStatus } from "@/server/services/auth";

const back = (form: FormData) => revalidatePath(String(form.get("returnTo") ?? "/admin"));
const str = (form: FormData, k: string) => String(form.get(k) ?? "");
const opt = (form: FormData, k: string) => str(form, k) || undefined;

export async function reviewPropertyAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await reviewProperty(a, str(form, "id"), { decision: str(form, "decision") as never, note: opt(form, "note") }); back(form); }, "Review recorded and partner notified.");
}
export async function listingControlsAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await updateListingControls(a, str(form, "id"), formToObject(form) as never); back(form); }, "Listing controls saved.");
}
export async function partnerStatusAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await setPartnerStatus(a, str(form, "id"), str(form, "status") as PartnerStatus, opt(form, "reason")); back(form); }, "Partner status updated.");
}
export async function partnerNotesAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await updatePartnerInternalNotes(a, str(form, "id"), str(form, "notes")); back(form); }, "Notes saved.");
}
export async function createAgreementAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await createAgreement(a, { ...(formToObject(form) as Record<string, string>), activate: form.get("activate") === "on", endDate: opt(form, "endDate") } as never); back(form); }, "Agreement saved.");
}
export async function agreementStatusAction(form: FormData): Promise<void> {
  await authed((a) => setAgreementStatus(a, str(form, "id"), str(form, "status") as never));
  back(form);
}
export async function leadStatusAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await updateLeadStatus(a, str(form, "id"), str(form, "status") as LeadStatus, opt(form, "note")); back(form); }, "Status updated.");
}
export async function assignLeadAction(form: FormData): Promise<void> {
  await authed((a) => assignLead(a, str(form, "id"), opt(form, "assigneeId") ?? null));
  back(form);
}
export async function introduceLeadAction(form: FormData): Promise<void> {
  await authed((a) => introduceLeadToPartner(a, str(form, "id")));
  back(form);
}
export async function commissionTransitionAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await transitionCommission(a, str(form, "id"), { status: str(form, "status") as never, reason: opt(form, "reason") }); back(form); }, "Commission updated.");
}
export async function commissionPaymentAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await recordCommissionPayment(a, str(form, "id"), { amount: str(form, "amount"), paidAt: str(form, "paidAt") as never, method: str(form, "method") as never, reference: str(form, "reference"), notes: opt(form, "notes") }); back(form); }, "Payment recorded.");
}
export async function commissionAdjustAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await adjustCommission(a, str(form, "id"), { actualAmount: str(form, "actualAmount"), reason: str(form, "reason") }); back(form); }, "Commission amount updated.");
}
export async function createVerificationAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await createVerification(a, { subjectType: str(form, "subjectType") as never, subjectId: str(form, "subjectId"), category: str(form, "category") as never, status: str(form, "status") as never, reviewDueAt: opt(form, "reviewDueAt") as never, publicNote: opt(form, "publicNote"), internalNotes: opt(form, "internalNotes") }); back(form); }, "Verification recorded.");
}
export async function verificationStatusAction(form: FormData): Promise<void> {
  await authed((a) => setVerificationStatus(a, str(form, "id"), str(form, "status") as never));
  back(form);
}
export async function resolveFlagAction(form: FormData): Promise<void> {
  await authed((a) => resolveFlag(a, str(form, "id"), str(form, "status") as Exclude<FlagStatus, "OPEN">, opt(form, "resolution")));
  back(form);
}
export async function raiseFlagAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => { await flagByStaff(a, str(form, "subjectType") as never, str(form, "subjectId"), str(form, "details")); back(form); }, "Flagged for review.");
}
export async function reviewDocumentAction(form: FormData): Promise<void> {
  await authed((a) => reviewDocument(a, str(form, "id"), str(form, "status") as Exclude<DocumentStatus, "PENDING">, opt(form, "notes")));
  back(form);
}
export async function moderateReviewAction(form: FormData): Promise<void> {
  await authed((a) => moderateReview(a, str(form, "id"), str(form, "status") as Exclude<ReviewStatus, "PENDING">, opt(form, "note")));
  back(form);
}
export async function saveArticleAction(_p: unknown, form: FormData): Promise<ActionResult> {
  const res = await authed(async (a) => saveArticle(a, opt(form, "id") ?? null, formToObject(form) as never));
  if (!res.ok) return res;
  redirect(`/admin/journal/${res.data!.id}?saved=1`);
}

const settingsForm = z.record(z.string(), z.string());
export async function saveSettingsAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => {
    assertPermission(a, "settings:manage");
    const raw = settingsForm.parse(formToObject(form));
    for (const key of Object.keys(settingSchemas) as SettingKey[]) {
      const isBool = settingSchemas[key]._def.typeName === "ZodBoolean";
      if (isBool) { await updateSetting(a, key, raw[key] === "on"); continue; }
      if (!(key in raw)) continue;
      const v = raw[key]!.trim();
      let value: unknown = v;
      if (key === "attribution.windowOptions") value = v.split(",").map((x) => Number(x.trim())).filter(Boolean);
      else if (/Days|Threshold/.test(key)) value = Number(v);
      else if (v === "" && key.startsWith("contact.")) value = null;
      await updateSetting(a, key, value);
    }
    revalidatePath("/", "layout");
  }, "Settings saved.");
}

export async function createStaffAction(_p: unknown, form: FormData): Promise<ActionResult> {
  return authed(async (a) => {
    assertPermission(a, "user:manage");
    const data = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema, role: z.enum(STAFF_ROLES as [UserRole, ...UserRole[]]) }).parse(formToObject(form));
    // Only a super admin can create another super admin.
    if (data.role === "SUPER_ADMIN" && a.role !== "SUPER_ADMIN") throw forbidden();
    if (await db.user.findUnique({ where: { email: data.email } })) throw new DomainError("CONFLICT", "That email is already registered.");
    const user = await db.user.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash: await hashPassword(data.password) } });
    await audit({ actorId: a.id, action: "user.created", entityType: "User", entityId: user.id, after: { email: user.email, role: user.role } });
    back(form);
  }, "Staff account created.");
}

export async function userStatusAction(form: FormData): Promise<void> {
  await authed(async (a) => {
    assertPermission(a, "user:manage");
    const id = str(form, "id");
    if (id === a.id) throw new DomainError("VALIDATION", "You can't change your own status.");
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPER_ADMIN" && a.role !== "SUPER_ADMIN") throw forbidden();
    await setUserStatus(a.id, id, str(form, "status") as never);
  });
  back(form);
}
