import { describe, expect, it } from "vitest";

import { similarityScore } from "@/lib/music/similarity";
import { fallbackGradient, hashString } from "@/lib/ui/gradient";
import { titleCase } from "@/lib/utils";

describe("fallbackGradient", () => {
  it("is deterministic and produces a valid CSS gradient", () => {
    expect(fallbackGradient("track-1")).toBe(fallbackGradient("track-1"));
    expect(fallbackGradient("track-1")).toMatch(/^linear-gradient\(135deg, #[0-9A-F]{6}, #[0-9A-F]{6}\)$/);
  });
  it("spreads different seeds across several palettes", () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => fallbackGradient(`seed-${i}`)));
    expect(seen.size).toBeGreaterThan(4);
  });
  it("hashString is stable", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});

describe("titleCase", () => {
  it("sentence-cases enum values for display", () => {
    expect(titleCase("HINDI")).toBe("Hindi");
    expect(titleCase("ELECTRO_POP")).toBe("Electro pop");
    expect(titleCase("")).toBe("");
  });
});

describe("similarityScore", () => {
  const base = { language: "HINDI", moods: ["RELAX", "CALM"], activities: ["STUDY"], genreNames: ["Lo-fi"] };

  it("scores identical tracks highest and unrelated tracks zero", () => {
    const unrelated = { language: "TAMIL", moods: ["PARTY"], activities: ["GYM"], genreNames: ["Bhangra"] };
    expect(similarityScore(base, unrelated)).toBe(0);
    expect(similarityScore(base, base)).toBe(3 + 4 + 1 + 1);
  });

  it("weights genre above mood above activity above language", () => {
    const genreOnly = { ...base, moods: [], activities: [], language: "X" };
    const moodOnly = { ...base, genreNames: [], activities: [], language: "X", moods: ["RELAX"] };
    const activityOnly = { ...base, genreNames: [], moods: [], language: "X" };
    const languageOnly = { language: "HINDI", moods: [], activities: [], genreNames: [] };
    const scores = [genreOnly, moodOnly, activityOnly, languageOnly].map((t) => similarityScore(base, t));
    expect(scores).toEqual([3, 2, 1, 1]);
  });

  it("is symmetric", () => {
    const other = { language: "HINDI", moods: ["CALM"], activities: [], genreNames: ["Lo-fi", "Ambient"] };
    expect(similarityScore(base, other)).toBe(similarityScore(other, base));
  });
});
