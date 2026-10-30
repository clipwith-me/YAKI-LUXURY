import { describe, expect, it } from "vitest";
import { RuleBasedInterpreter, parseAmount } from "@/server/search/interpreter";
import { filtersToSearchParams, parseSearchParams } from "@/server/search/filters";

const ctx = {
  locations: [
    { path: "lagos", names: ["lagos"] },
    { path: "lagos/lekki", names: ["lekki"] },
    { path: "lagos/ikoyi", names: ["ikoyi"] },
    { path: "lagos/banana-island", names: ["banana island"] },
    { path: "lagos/victoria-island", names: ["victoria island"] },
    { path: "abuja/maitama", names: ["maitama"] },
  ],
};
const interpreter = new RuleBasedInterpreter();

describe("natural-language search", () => {
  it("understands the brief's first example", async () => {
    const { filters } = await interpreter.interpret("Show me a 4 bedroom luxury duplex in Lekki under ₦250 million.", ctx);
    expect(filters).toMatchObject({ minBedrooms: 4, luxury: true, propertyTypes: ["DETACHED_DUPLEX"], location: "lagos/lekki", maxPrice: 250_000_000 });
  });
  it("understands the brief's second example", async () => {
    const { filters } = await interpreter.interpret("I want a furnished apartment in Ikoyi with a swimming pool.", ctx);
    expect(filters).toMatchObject({ furnished: true, propertyTypes: ["APARTMENT"], location: "lagos/ikoyi", amenities: ["pool"] });
  });
  it("detects rent, ranges and multi-word areas", async () => {
    const { filters } = await interpreter.interpret("3 bed flat to rent in banana island between 10m and 25m with gym and BQ", ctx);
    expect(filters).toMatchObject({ listingType: "RENT", minBedrooms: 3, minPrice: 10_000_000, maxPrice: 25_000_000, location: "lagos/banana-island" });
    expect(filters.amenities).toEqual(expect.arrayContaining(["gym", "bq"]));
  });
  it("does not treat 'real estate' as an estate amenity", async () => {
    const { filters } = await interpreter.interpret("real estate in Maitama", ctx);
    expect(filters.amenities).toBeUndefined();
    expect(filters.location).toBe("abuja/maitama");
  });
  it("parses Nigerian amount formats", () => {
    expect(parseAmount("₦250 million")).toBe(250_000_000);
    expect(parseAmount("N1.2bn")).toBe(1_200_000_000);
    expect(parseAmount("250,000,000")).toBe(250_000_000);
    expect(parseAmount("850k")).toBe(850_000);
  });
});

describe("search params", () => {
  it("round-trips filters through the URL", () => {
    const filters = parseSearchParams({ listingType: "SALE", location: "lagos/lekki", minBedrooms: "4", amenities: "pool,gym", luxury: "1" });
    const params = Object.fromEntries(filtersToSearchParams(filters));
    expect(parseSearchParams(params)).toEqual(filters);
  });
  it("drops invalid params without discarding valid ones", () => {
    const filters = parseSearchParams({ listingType: "BOGUS", location: "../../etc", minBedrooms: "3" });
    expect(filters).toEqual({ minBedrooms: 3 });
  });
});
