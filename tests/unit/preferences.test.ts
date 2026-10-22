import { describe, expect, it } from "vitest";

import { preferenceSchema } from "@/lib/preferences/schemas";

describe("music preference validation", () => {
  it("accepts supported selections and onboarding state", () => {
    expect(
      preferenceSchema.safeParse({
        languages: ["HINDI", "ENGLISH"],
        genres: ["lo-fi", "indie-fusion"],
        moods: ["RELAX"],
        onboardingCompleted: true,
        onboardingSkipped: false,
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported enum values and malformed genre slugs", () => {
    expect(
      preferenceSchema.safeParse({
        languages: ["KRYPTON"],
        genres: ["Lo fi"],
        moods: ["UNKNOWN"],
      }).success,
    ).toBe(false);
  });

  it("enforces bounded selections", () => {
    expect(
      preferenceSchema.safeParse({
        languages: Array.from({ length: 10 }, () => "HINDI"),
        genres: [],
        moods: [],
      }).success,
    ).toBe(false);
  });
});
