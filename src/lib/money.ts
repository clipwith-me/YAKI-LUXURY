/**
 * Money helpers. All amounts are integer kobo (NGN minor unit) held as bigint so that
 * ₦250,000,000.00 and percentage maths never suffer floating-point drift.
 */
export const KOBO_PER_NAIRA = 100n;

export function nairaToKobo(naira: number | string): bigint {
  const text = typeof naira === "number" ? naira.toFixed(2) : naira.replace(/[,\s₦]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new RangeError(`Invalid naira amount: ${naira}`);
  const [whole = "0", frac = ""] = text.split(".");
  return BigInt(whole) * KOBO_PER_NAIRA + BigInt(frac.padEnd(2, "0"));
}

export function koboToNaira(kobo: bigint): number {
  return Number(kobo) / 100;
}

const fullFormatter = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** ₦150,000,000 */
export function formatNaira(kobo: bigint): string {
  return `₦${fullFormatter.format(Math.round(koboToNaira(kobo)))}`;
}

/** ₦150M, ₦1.2B, ₦850K — for cards and filters. */
export function formatNairaCompact(kobo: bigint): string {
  const n = koboToNaira(kobo);
  const units: Array<[number, string]> = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const value = n / size;
      const digits = value >= 100 || Number.isInteger(value) ? 0 : 1;
      return `₦${value.toFixed(digits).replace(/\.0$/, "")}${suffix}`;
    }
  }
  return formatNaira(kobo);
}

/**
 * Applies a basis-point rate with half-up rounding to the nearest kobo.
 * 2% (200 bps) of ₦150,000,000 → ₦3,000,000.
 */
export function applyBasisPoints(amountKobo: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0) throw new RangeError("Rate must be a non-negative integer bps");
  const numerator = amountKobo * BigInt(bps);
  return (numerator + 5000n) / 10000n;
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
