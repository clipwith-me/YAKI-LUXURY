export const site = {
  name: "YAKI'S LUXE HOMES",
  shortName: "YAKI",
  tagline: "A premium real-estate marketplace connecting serious buyers with trusted property partners.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
