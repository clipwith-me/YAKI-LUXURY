"use client";

import { ActionForm, SubmitButton } from "./action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/fields";
import { savePropertyAction } from "@/app/actions/partner";
import { propertyTypeLabels } from "@/lib/labels";

const AMENITIES = [["pool", "Swimming pool"], ["gym", "Gym"], ["cinema", "Home cinema"], ["garden", "Garden"], ["balcony", "Balcony / terrace"], ["waterfront", "Waterfront"], ["security", "24/7 security"], ["estate", "Gated estate"], ["parking", "Parking"], ["generator", "Generator"], ["power", "Constant power"], ["water", "Treated water"], ["smart_home", "Smart home"], ["elevator", "Elevator"], ["bq", "BQ"]] as const;

export type PropertyFormValues = {
  id?: string;
  title?: string;
  description?: string;
  listingType?: string;
  propertyType?: string;
  locationId?: string;
  addressLine?: string;
  price?: string;
  pricePeriod?: string;
  priceOnRequest?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number | null;
  plotSizeSqm?: number | null;
  parkingSpaces?: number | null;
  furnished?: boolean;
  serviced?: boolean;
  offPlan?: boolean;
  newConstruction?: boolean;
  availability?: string;
  developmentName?: string | null;
  developerName?: string | null;
  completionDate?: string | null;
  partnerReference?: string | null;
  documentationInfo?: string | null;
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
  floorPlanUrl?: string | null;
  features?: string[];
  amenities?: string[];
  imageUrls?: string[];
};

/** Partner (and staff) listing form. Submitting always routes through admin review. */
export function PropertyForm({ values = {}, locations, partners, canSubmit = true }: { values?: PropertyFormValues; locations: Array<{ id: string; label: string; group: string }>; partners?: Array<{ id: string; name: string }>; canSubmit?: boolean }) {
  const groups = [...new Set(locations.map((l) => l.group))];
  const amen = new Set(values.amenities ?? []);
  return (
    <ActionForm action={savePropertyAction}>
      {({ fieldErrors: e }) => (
        <div className="space-y-10">
          {values.id && <input type="hidden" name="id" value={values.id} />}
          {partners && !values.id && (
            <Field label="Partner" htmlFor="partnerId" required><Select id="partnerId" name="partnerId" required>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          )}
          <Section title="Essentials">
            <Field label="Title" htmlFor="title" error={e.title} required className="sm:col-span-2"><Input id="title" name="title" defaultValue={values.title} placeholder="e.g. Contemporary 5-Bedroom Detached Duplex with Pool" required /></Field>
            <Field label="Listing type" htmlFor="listingType" error={e.listingType} required><Select id="listingType" name="listingType" defaultValue={values.listingType ?? "SALE"}><option value="SALE">For sale</option><option value="RENT">For rent</option></Select></Field>
            <Field label="Property type" htmlFor="propertyType" error={e.propertyType} required><Select id="propertyType" name="propertyType" defaultValue={values.propertyType ?? "DETACHED_DUPLEX"}>{Object.entries(propertyTypeLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Description" htmlFor="description" error={e.description} required className="sm:col-span-2"><Textarea id="description" name="description" rows={7} defaultValue={values.description} required /></Field>
          </Section>
          <Section title="Price & availability">
            <Field label="Price (₦)" htmlFor="price" error={e.price} required><Input id="price" name="price" inputMode="decimal" defaultValue={values.price} placeholder="150,000,000" /></Field>
            <Field label="Price period" htmlFor="pricePeriod" error={e.pricePeriod}><Select id="pricePeriod" name="pricePeriod" defaultValue={values.pricePeriod ?? "TOTAL"}><option value="TOTAL">Total (sale)</option><option value="PER_YEAR">Per year</option><option value="PER_MONTH">Per month</option></Select></Field>
            <Field label="Availability" htmlFor="availability"><Select id="availability" name="availability" defaultValue={values.availability ?? "AVAILABLE"}><option value="AVAILABLE">Available</option><option value="UNDER_OFFER">Under offer</option><option value="SOLD">Sold</option><option value="LET">Let</option><option value="OFF_MARKET">Off market</option></Select></Field>
            <div className="flex items-end pb-3"><Checkbox name="priceOnRequest" defaultChecked={values.priceOnRequest} label="Price on request" /></div>
          </Section>
          <Section title="Location">
            <Field label="Area" htmlFor="locationId" error={e.locationId} required><Select id="locationId" name="locationId" defaultValue={values.locationId ?? ""} required><option value="" disabled>Choose an area</option>{groups.map((g) => <optgroup key={g} label={g}>{locations.filter((l) => l.group === g).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</optgroup>)}</Select></Field>
            <Field label="Address" htmlFor="addressLine" error={e.addressLine} hint="Kept private — only the area is shown publicly." required><Input id="addressLine" name="addressLine" defaultValue={values.addressLine} required /></Field>
          </Section>
          <Section title="Specification">
            <Field label="Bedrooms" htmlFor="bedrooms" error={e.bedrooms} required><Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={values.bedrooms ?? 0} /></Field>
            <Field label="Bathrooms" htmlFor="bathrooms" error={e.bathrooms} required><Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={values.bathrooms ?? 0} /></Field>
            <Field label="Internal size (m²)" htmlFor="sizeSqm" error={e.sizeSqm}><Input id="sizeSqm" name="sizeSqm" type="number" min={1} defaultValue={values.sizeSqm ?? ""} /></Field>
            <Field label="Plot size (m²)" htmlFor="plotSizeSqm" error={e.plotSizeSqm}><Input id="plotSizeSqm" name="plotSizeSqm" type="number" min={1} defaultValue={values.plotSizeSqm ?? ""} /></Field>
            <Field label="Parking spaces" htmlFor="parkingSpaces" error={e.parkingSpaces}><Input id="parkingSpaces" name="parkingSpaces" type="number" min={0} defaultValue={values.parkingSpaces ?? ""} /></Field>
            <div className="grid grid-cols-2 gap-2 pt-6">
              <Checkbox name="furnished" defaultChecked={values.furnished} label="Furnished" />
              <Checkbox name="serviced" defaultChecked={values.serviced} label="Serviced" />
              <Checkbox name="offPlan" defaultChecked={values.offPlan} label="Off-plan" />
              <Checkbox name="newConstruction" defaultChecked={values.newConstruction} label="New construction" />
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-[13px] font-medium text-stone-700">Amenities</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{AMENITIES.map(([k, l]) => <Checkbox key={k} name="amenities[]" value={k} defaultChecked={amen.has(k)} label={l} />)}</div>
            </fieldset>
            <Field label="Features (one per line)" htmlFor="features" error={e.features} className="sm:col-span-2"><Textarea id="features" name="features" rows={4} defaultValue={(values.features ?? []).join("\n")} placeholder={"Rooftop terrace\nFitted kitchen"} /></Field>
          </Section>
          <Section title="Development">
            <Field label="Development name" htmlFor="developmentName"><Input id="developmentName" name="developmentName" defaultValue={values.developmentName ?? ""} /></Field>
            <Field label="Developer" htmlFor="developerName"><Input id="developerName" name="developerName" defaultValue={values.developerName ?? ""} /></Field>
            <Field label="Expected completion" htmlFor="completionDate" error={e.completionDate}><Input id="completionDate" name="completionDate" type="date" defaultValue={values.completionDate ?? ""} /></Field>
            <Field label="Your reference" htmlFor="partnerReference"><Input id="partnerReference" name="partnerReference" defaultValue={values.partnerReference ?? ""} /></Field>
          </Section>
          <Section title="Media">
            <Field label="Upload photos" htmlFor="photos" hint="JPG, PNG or WebP, up to 8MB each. The first photo is the cover." className="sm:col-span-2"><Input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /></Field>
            <Field label="Photo links (one per line)" htmlFor="imageUrls" error={e.imageUrls} hint="Existing photos are kept in this order. Remove a line to remove a photo." className="sm:col-span-2"><Textarea id="imageUrls" name="imageUrls" rows={4} defaultValue={(values.imageUrls ?? []).join("\n")} /></Field>
            <Field label="Video link" htmlFor="videoUrl" error={e.videoUrl}><Input id="videoUrl" name="videoUrl" type="url" placeholder="https://" defaultValue={values.videoUrl ?? ""} /></Field>
            <Field label="Virtual tour link" htmlFor="virtualTourUrl" error={e.virtualTourUrl}><Input id="virtualTourUrl" name="virtualTourUrl" type="url" placeholder="https://" defaultValue={values.virtualTourUrl ?? ""} /></Field>
            <Field label="Floor plan link" htmlFor="floorPlanUrl" error={e.floorPlanUrl}><Input id="floorPlanUrl" name="floorPlanUrl" type="url" placeholder="https://" defaultValue={values.floorPlanUrl ?? ""} /></Field>
          </Section>
          <Section title="Documentation (private)">
            <Field label="Documentation information" htmlFor="documentationInfo" hint="Visible to YAKI staff only. Upload supporting files under Documents. This is not shown publicly and is not a verification." className="sm:col-span-2"><Textarea id="documentationInfo" name="documentationInfo" rows={3} defaultValue={values.documentationInfo ?? ""} /></Field>
          </Section>
          <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-stone-200 bg-stone-50 py-4">
            {canSubmit && <SubmitButton name="intent" value="submit" pendingLabel="Submitting…">Submit for review</SubmitButton>}
            <SubmitButton name="intent" value="draft" variant="outline" pendingLabel="Saving…">Save draft</SubmitButton>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 border border-stone-200 bg-white p-6 sm:grid-cols-2">
      <legend className="px-2 font-display text-xl">{title}</legend>
      {children}
    </fieldset>
  );
}
