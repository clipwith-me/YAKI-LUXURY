/**
 * Nigerian phone handling. We store E.164 (+234XXXXXXXXXX) and display as +234 803 123 4567.
 * Accepts 0803..., 803..., 234803..., +234 803 ...
 */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let national: string;
  if (digits.startsWith("234")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  // Nigerian mobile/fixed national significant numbers are 10 digits after the trunk 0.
  if (!/^[789]\d{9}$/.test(national)) return null;
  return `+234${national}`;
}

export function formatNigerianPhone(e164: string): string {
  const m = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** wa.me expects digits only, no plus. */
export function whatsappNumber(e164: string): string {
  return e164.replace(/\D/g, "");
}
