import { ArticleCategory, ArticleStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { assertPermission, type Actor } from "@/server/authz/policies";
import { notFound } from "@/server/errors";
import { slugify } from "@/lib/slug";
import { optionalText, optionalUrl } from "@/server/validation/common";

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  MARKET_NEWS: "Market News",
  BUYING_GUIDES: "Buying Guides",
  INVESTMENT: "Investment",
  LUXURY_HOMES: "Luxury Homes",
  PROPERTY_DEVELOPMENT: "Property Development",
  NEIGHBOURHOOD_GUIDES: "Neighbourhood Guides",
  MORTGAGE_FINANCE: "Mortgage & Finance",
  HOME_DESIGN: "Home Design",
  DOCUMENTATION_EDUCATION: "Documentation Education",
};

export const articleSchema = z.object({
  title: z.string().trim().min(5).max(160),
  excerpt: z.string().trim().min(20).max(300),
  body: z.string().trim().min(100).max(50000),
  category: z.nativeEnum(ArticleCategory),
  coverImage: optionalUrl,
  authorName: z.string().trim().min(2).max(80),
  status: z.nativeEnum(ArticleStatus),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
});

export async function saveArticle(actor: Actor, id: string | null, input: z.input<typeof articleSchema>) {
  assertPermission(actor, "content:manage");
  const data = articleSchema.parse(input);
  if (id) {
    const before = await db.article.findUnique({ where: { id } });
    if (!before) throw notFound();
    const after = await db.article.update({ where: { id }, data: { ...data, publishedAt: data.status === "PUBLISHED" ? before.publishedAt ?? new Date() : before.publishedAt } });
    await audit({ actorId: actor.id, action: "article.updated", entityType: "Article", entityId: id, before: { status: before.status, title: before.title }, after: { status: after.status, title: after.title } });
    return after;
  }
  const base = slugify(data.title);
  const exists = await db.article.findUnique({ where: { slug: base }, select: { id: true } });
  const created = await db.article.create({
    data: { ...data, slug: exists ? `${base}-${Date.now().toString(36)}` : base, publishedAt: data.status === "PUBLISHED" ? new Date() : null },
  });
  await audit({ actorId: actor.id, action: "article.created", entityType: "Article", entityId: created.id, after: { title: created.title, status: created.status } });
  return created;
}

export async function publishedArticles(opts: { category?: ArticleCategory; take?: number } = {}) {
  return db.article.findMany({
    where: { status: "PUBLISHED", ...(opts.category ? { category: opts.category } : {}) },
    select: { id: true, slug: true, title: true, excerpt: true, category: true, coverImage: true, publishedAt: true, authorName: true, isDemo: true },
    orderBy: { publishedAt: "desc" },
    take: opts.take ?? 24,
  });
}
