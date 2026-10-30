import type { ArticleCategory } from "@prisma/client";

// Sample journal content for the DEMO. General education only — no legal advice, no market data.
export const DEMO_ARTICLES: Array<{ slug: string; title: string; excerpt: string; body: string; category: ArticleCategory; coverImage: string; authorName: string; daysAgo: number; seoDescription: string }> = [
  {
    slug: "a-buyers-checklist-before-you-commit-to-a-property",
    title: "A Buyer's Checklist Before You Commit to a Property",
    excerpt: "The questions serious buyers ask before paying for any property — and why an independent lawyer belongs on your team from day one.",
    category: "BUYING_GUIDES",
    coverImage: "1600596542815-ffad4c1539a9",
    authorName: "YAKI Editorial (Sample)",
    daysAgo: 6,
    seoDescription: "A practical checklist for property buyers in Nigeria: who you are dealing with, what to ask, and when to involve professionals.",
    body: `Sample article — general information only, not legal, financial or tax advice.

## Know exactly who you are dealing with
Before anything else, confirm the identity of the person or company offering the property and their authority to sell or let it. Ask for their full company name and registration details, and check that the people you meet actually represent that company.

## Instruct your own lawyer early
Engage a qualified lawyer who acts for you — not for the seller or developer. Your lawyer can advise on the documents that apply to the specific property and carry out the searches and checks appropriate to it.

## Never rush a payment
Pressure to "pay today to secure it" is a warning sign. Pay only into accounts in the name of the contracting party, keep written records and receipts of every payment, and make sure every agreement is in writing.

## Visit in person
Inspect the property yourself, at different times of day if you can. Look at access roads, drainage, power and water arrangements, and the neighbourhood.

## Understand the full cost
Ask in writing about service charges, development levies, legal fees, agency fees and any other costs, so there are no surprises.

## How YAKI'S LUXE HOMES fits in
We connect you with partners and help you arrange viewings. The transaction itself is between you and the partner or seller, and our verification badges describe only the specific checks we performed — they are never a substitute for your own legal due diligence.`,
  },
  {
    slug: "understanding-off-plan-property-purchases",
    title: "Understanding Off-Plan Property Purchases",
    excerpt: "Off-plan can offer attractive entry prices and payment plans. Here is how to think about the trade-offs.",
    category: "INVESTMENT",
    coverImage: "1605276374104-dee2a0ed3cd6",
    authorName: "YAKI Editorial (Sample)",
    daysAgo: 12,
    seoDescription: "What buying off-plan means, the potential benefits, the risks to consider, and the questions to ask a developer.",
    body: `Sample article — general information only, not investment or legal advice.

## What "off-plan" means
Buying off-plan means agreeing to buy a home before it is completed — sometimes before construction has started — usually based on plans, renders and a show unit.

## Why buyers consider it
Developers sometimes offer lower prices or staged payment plans at early phases. Buyers may also get more choice of unit and finishes.

## What to weigh carefully
Completion dates can move. Specifications can change. Your money is committed for longer. Ask what happens if the project is delayed, how payments are protected, and what the contract says about specification changes and refunds.

## Questions to ask the developer
- What approvals are in place for this project, and can my lawyer review them?
- What is the construction timeline, and how will progress be reported?
- What exactly is included in the price, and what costs come later?
- What are the terms if I need to exit before completion?

Always have your own lawyer review the contract before signing.`,
  },
  {
    slug: "choosing-a-neighbourhood-lekki-ikoyi-maitama",
    title: "Choosing a Neighbourhood: Questions That Matter More Than the Postcode",
    excerpt: "Commute, power, drainage, schools and lifestyle — how to compare neighbourhoods like Lekki, Ikoyi and Maitama for the way you actually live.",
    category: "NEIGHBOURHOOD_GUIDES",
    coverImage: "1600585154340-be6161a56a0c",
    authorName: "YAKI Editorial (Sample)",
    daysAgo: 20,
    seoDescription: "How to compare neighbourhoods in Lagos and Abuja based on commute, utilities, amenities and long-term plans.",
    body: `Sample article — general information only.

## Start with your daily routine
Map your commute at the times you actually travel. A beautiful home loses its shine if every journey takes two hours.

## Utilities shape daily life
Ask about power arrangements, water supply and drainage during the rainy season. In estates, ask how shared services are run and funded.

## Lifestyle and services
Consider schools, healthcare, shopping, places of worship and restaurants within easy reach.

## Think long term
Ask about planned infrastructure and nearby developments, and how they might change traffic, noise and value over time.

## See it for yourself
Visit at different times of day and talk to residents where you can. Our advisors can help you arrange viewings across several neighbourhoods so you can compare.`,
  },
];
