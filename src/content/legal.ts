/**
 * Legal & trust page TEMPLATES. They describe how the platform actually works so counsel has an
 * accurate starting point. None of this is final legal text and it makes no compliance claims.
 */
export type LegalDoc = { title: string; summary: string; sections: Array<{ heading: string; body: string[] }> };

const REVIEW = "This document is a working template. Final wording must be reviewed and approved by qualified Nigerian legal professionals before it is relied upon.";

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    summary: "How we collect, use and protect personal information when you use YAKI'S LUXE HOMES.",
    sections: [
      { heading: "Who we are", body: ["YAKI'S LUXE HOMES operates an online property marketplace and referral platform. [Legal entity name, registration details and contact address to be inserted.]"] },
      { heading: "Information we collect", body: ["Details you give us: your name, email address, phone number, enquiry messages, viewing preferences and account details.", "Usage information: pages and listings viewed, searches, saved properties and alerts, recorded against a random visitor identifier. We do not store your raw IP address in our analytics or lead records.", "Marketing context: how you first arrived (for example a campaign link), used to understand which channels work and to attribute referrals to our partners."] },
      { heading: "How we use it", body: ["To respond to your enquiries, arrange viewings and introduce you to the relevant listing partner.", "To operate your account, saved properties and alerts.", "To keep a record of referrals made under our partnership agreements.", "To keep the platform secure, prevent spam and investigate misuse."] },
      { heading: "Sharing with partners", body: ["When you enquire about a property, we notify the listing partner that an enquiry exists without sharing your contact details. Your details are shared with that partner only when our team introduces you, based on the consent you give on the enquiry form."] },
      { heading: "Retention", body: ["[Retention periods for enquiries, accounts, analytics and referral records to be defined with counsel, taking into account commission and record-keeping obligations.]"] },
      { heading: "Your rights", body: ["You may ask to access, correct or delete your personal information, or withdraw consent to marketing. [Rights and the process for exercising them under applicable Nigerian data-protection law to be confirmed by counsel.]"] },
      { heading: "Contact", body: ["[Data protection contact details to be inserted.]"] },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    summary: "The terms that apply when you use the YAKI'S LUXE HOMES website and services.",
    sections: [
      { heading: "What we do", body: ["YAKI'S LUXE HOMES displays property listings provided by independent partners (developers, agencies, real-estate companies and, where appropriate, owners) and connects interested customers with those partners.", "Unless expressly stated on a listing, YAKI'S LUXE HOMES is not the owner, seller, landlord or agent of any listed property and is not a party to any transaction between you and a partner."] },
      { heading: "Listings", body: ["Listing information is supplied by partners. We review listings before publication but do not guarantee their accuracy, completeness, title, ownership or condition."] },
      { heading: "Payments", body: ["We do not ask customers to pay property purchase or rental money through YAKI'S LUXE HOMES. Payments for property are made between you and the relevant transaction party. Be cautious of anyone asking you to pay us for a property."] },
      { heading: "Accounts", body: ["You are responsible for keeping your login details secure. We may suspend accounts used for fraud, spam or misuse."] },
      { heading: "Liability", body: ["[Limitations of liability, governing law and dispute resolution to be drafted by counsel.]"] },
    ],
  },
  "property-disclaimer": {
    title: "Property Disclaimer",
    summary: "What a listing on YAKI'S LUXE HOMES does — and does not — tell you.",
    sections: [
      { heading: "Information comes from partners", body: ["Prices, descriptions, photographs, sizes and availability are provided by the listing partner and may change without notice."] },
      { heading: "No title or legal guarantee", body: ["A listing — including one with a verification badge — is not a confirmation of title, ownership, planning status or the absence of encumbrances. Always instruct your own lawyer and carry out independent searches before paying any money."] },
      { heading: "Approximate locations", body: ["Maps show approximate neighbourhood locations. Exact addresses are shared after introduction to the partner."] },
      { heading: "Demonstration data", body: ["During launch, some listings, partners and articles are fictional demonstration content. These are clearly labelled “Demo” and do not represent real properties or companies."] },
    ],
  },
  "verification-policy": {
    title: "Verification Policy",
    summary: "Exactly what each badge on YAKI'S LUXE HOMES means.",
    sections: [
      { heading: "Our principle", body: ["We only display a badge when a member of our team has completed a specific check and recorded it. Badges show the date of the check and expire when their review date passes. No badge is ever generated automatically."] },
      { heading: "Verified Partner", body: ["We reviewed the partner's business identity and registration details on the date shown."] },
      { heading: "Listing Verified", body: ["We confirmed with the partner that the listing is authorised and currently marketed by them on the date shown."] },
      { heading: "Inspection Completed", body: ["A representative visited the property on the date shown. This is a visual inspection, not a structural survey."] },
      { heading: "Documentation Reviewed", body: ["We sighted documents supplied by the partner on the date shown. This is not a legal opinion or a title search."] },
      { heading: "Not verified / Verification pending", body: ["Listings without a badge were reviewed before publication but have not received an additional check. “Pending” means a check has started but is not complete."] },
      { heading: "What no badge means", body: ["No badge guarantees title, ownership, value or the outcome of any transaction. Always take independent legal advice."] },
    ],
  },
  "partner-terms": {
    title: "Partner Terms",
    summary: "The framework for developers, agencies and companies listing on YAKI'S LUXE HOMES.",
    sections: [
      { heading: "Eligibility", body: ["Partners must be authorised to market the properties they list and must provide accurate business and contact information. We may request registration, licensing or authority documents where relevant."] },
      { heading: "Listings and review", body: ["All listings are reviewed before publication. Edits to live listings are re-reviewed. We may decline, suspend or remove listings."] },
      { heading: "Leads and introductions", body: ["Enquiries are captured by YAKI'S LUXE HOMES and given a lead reference. Customer contact details are shared with the partner on introduction."] },
      { heading: "Commercial terms", body: ["Referral fees, attribution periods and payment terms are set out in each partner's individual agreement. See the Referral & Commission Terms."] },
    ],
  },
  "referral-commission-terms": {
    title: "Referral & Commission Terms",
    summary: "How referrals are recorded and how referral commission is calculated and paid.",
    sections: [
      { heading: "Referral record", body: ["Each enquiry receives a unique lead reference (for example YLH-2026-00482) and a timestamped record of how and when the customer arrived, which property they enquired about and when they were introduced."] },
      { heading: "Protection period", body: ["Each partner agreement sets a referral protection period (for example 30, 60, 90, 180 or 365 days) during which a completed transaction with an introduced customer is treated as a YAKI referral."] },
      { heading: "Calculation", body: ["Commission is either a percentage of the final transaction price or a fixed fee, as set in the agreement or for a specific property. Example: 2% of ₦150,000,000 is ₦3,000,000."] },
      { heading: "Payment", body: ["Commission is payable by the partner to YAKI'S LUXE HOMES according to the agreement's payment terms. It is entirely separate from any money the customer pays for the property."] },
      { heading: "Disputes", body: ["[Dispute resolution process to be defined in partner agreements with counsel.]"] },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    summary: "The small number of cookies we use and why.",
    sections: [
      { heading: "Essential cookies", body: ["ylh_session — keeps you signed in (only set when you sign in).", "ylh_vid — a random visitor identifier used to count unique visits without personal data.", "ylh_attr — remembers how you first arrived (e.g. campaign) so referrals can be attributed correctly."] },
      { heading: "Third parties", body: ["Map tiles are loaded from a mapping provider when you view a map. We do not use advertising cookies. [Review cookie consent requirements with counsel.]"] },
    ],
  },
  "refunds-cancellations": {
    title: "Refund & Cancellation Policy",
    summary: "Our position on payments, refunds and cancellations.",
    sections: [
      { heading: "We do not take property payments", body: ["YAKI'S LUXE HOMES does not receive customers' purchase, reservation or rental payments. Refunds and cancellations of property transactions are governed by your agreement with the seller, landlord or developer."] },
      { heading: "Future paid services", body: ["If paid services are introduced, their refund terms will be stated here before launch. [To be drafted with counsel.]"] },
    ],
  },
  complaints: {
    title: "Complaints Policy",
    summary: "How to raise a concern about a listing, a partner or our service.",
    sections: [
      { heading: "How to complain", body: ["Contact our support team with your lead reference (if any) and a description of the issue. We will acknowledge your complaint and investigate."] },
      { heading: "Concerns about a listing or partner", body: ["Reports are treated as signals for investigation, not proof. We may suspend a listing or partner while we investigate."] },
      { heading: "Timelines and escalation", body: ["[Response timelines and escalation routes to be defined.]"] },
    ],
  },
  "data-protection": {
    title: "Data Protection Notice",
    summary: "A short notice on how enquiry information is handled.",
    sections: [
      { heading: "Enquiry data", body: ["When you submit an enquiry we store your name, email, phone number and message to respond and, with your consent, introduce you to the listing partner."] },
      { heading: "Minimisation", body: ["We avoid collecting what we don't need: no raw IP addresses in records, approximate locations only on maps, and partner access to your details only after introduction."] },
      { heading: "Contact", body: ["[Data protection contact to be inserted.]"] },
    ],
  },
};

export const LEGAL_REVIEW_NOTICE = REVIEW;
