import { NextResponse, type NextRequest } from "next/server";

const VISITOR_COOKIE = "ylh_vid";
const ATTRIBUTION_COOKIE = "ylh_attr";
const SESSION_COOKIE = "ylh_session";
const PROTECTED = ["/account", "/partner", "/admin"];

/**
 * Edge middleware:
 * 1. Assigns an anonymous visitor id (random, no PII) for analytics de-duplication.
 * 2. Captures FIRST-TOUCH marketing context (UTM, referrer, landing page) once, for lead attribution.
 * 3. Fast-path redirect to sign-in for protected areas. Real authorization happens server-side.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.get(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const secure = req.nextUrl.protocol === "https:";
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  if (!req.cookies.get(ATTRIBUTION_COOKIE)) {
    const referrer = req.headers.get("referer");
    const external = referrer && !referrer.startsWith(req.nextUrl.origin) ? referrer.slice(0, 300) : undefined;
    const touch: Record<string, string> = { at: new Date().toISOString(), landing: `${pathname}${req.nextUrl.search}`.slice(0, 300) };
    if (external) touch.referrer = external;
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = searchParams.get(key);
      if (v) touch[key] = v.slice(0, 120);
    }
    res.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(touch), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}

export const config = {
  // Skip static assets, images and API routes.
  matcher: ["/((?!_next/static|_next/image|media/|api/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
