"use client";

import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Select } from "@/components/ui/fields";
import { uploadDocumentAction } from "@/app/actions/partner";

const TYPES = [["COMPANY_REGISTRATION", "Company registration"], ["PROFESSIONAL_LICENSE", "Professional licence"], ["TITLE_DOCUMENT", "Title document"], ["SURVEY_PLAN", "Survey plan"], ["BUILDING_APPROVAL", "Building approval"], ["IDENTITY", "Identity document"], ["OTHER", "Other"]] as const;

export function DocumentUploadForm({ properties }: { properties: Array<{ id: string; title: string }> }) {
  return (
    <ActionForm action={uploadDocumentAction} resetOnSuccess>
      {({ fieldErrors: e }) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Title" htmlFor="title" error={e.title} required><Input id="title" name="title" required /></Field>
          <Field label="Type" htmlFor="type"><Select id="type" name="type">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Related property" htmlFor="propertyId"><Select id="propertyId" name="propertyId"><option value="">Company document</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
          <Field label="File" htmlFor="file" error={e.file} hint="PDF, JPG, PNG or WebP · max 15MB" required><Input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></Field>
          <Field label="Expiry date (if any)" htmlFor="expiresAt"><Input id="expiresAt" name="expiresAt" type="date" /></Field>
          <div className="flex items-end"><SubmitButton pendingLabel="Uploading…">Upload</SubmitButton></div>
        </div>
      )}
    </ActionForm>
  );
}
