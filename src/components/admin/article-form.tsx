"use client";

import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { saveArticleAction } from "@/app/actions/admin";

export function ArticleForm({ v, categories }: { v: { id?: string; title?: string; excerpt?: string; body?: string; category?: string; coverImage?: string | null; authorName?: string; status?: string; seoTitle?: string | null; seoDescription?: string | null }; categories: Array<[string, string]> }) {
  return (
    <ActionForm action={saveArticleAction}>
      {({ fieldErrors: e }) => (
        <div className="grid gap-5 border border-stone-200 bg-white p-6 sm:grid-cols-2">
          {v.id && <input type="hidden" name="id" value={v.id} />}
          <Field label="Title" htmlFor="title" error={e.title} className="sm:col-span-2"><Input id="title" name="title" defaultValue={v.title} required /></Field>
          <Field label="Excerpt" htmlFor="excerpt" error={e.excerpt} className="sm:col-span-2"><Textarea id="excerpt" name="excerpt" rows={2} defaultValue={v.excerpt} /></Field>
          <Field label="Body" htmlFor="body" error={e.body} hint="Use '## ' for headings, '- ' for list items, blank lines between paragraphs." className="sm:col-span-2"><Textarea id="body" name="body" rows={18} defaultValue={v.body} className="font-mono text-sm" /></Field>
          <Field label="Category" htmlFor="category"><Select id="category" name="category" defaultValue={v.category ?? "BUYING_GUIDES"}>{categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Status" htmlFor="status"><Select id="status" name="status" defaultValue={v.status ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></Select></Field>
          <Field label="Author" htmlFor="authorName" error={e.authorName}><Input id="authorName" name="authorName" defaultValue={v.authorName ?? "YAKI Editorial"} /></Field>
          <Field label="Cover image URL" htmlFor="coverImage" error={e.coverImage}><Input id="coverImage" name="coverImage" type="url" defaultValue={v.coverImage ?? ""} /></Field>
          <Field label="SEO title" htmlFor="seoTitle" error={e.seoTitle}><Input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={v.seoTitle ?? ""} /></Field>
          <Field label="SEO description" htmlFor="seoDescription" error={e.seoDescription}><Input id="seoDescription" name="seoDescription" maxLength={170} defaultValue={v.seoDescription ?? ""} /></Field>
          <div className="sm:col-span-2"><SubmitButton>Save article</SubmitButton></div>
        </div>
      )}
    </ActionForm>
  );
}
