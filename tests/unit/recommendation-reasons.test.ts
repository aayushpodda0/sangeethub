import { describe, expect, it } from "vitest";

import { buildReasons } from "@/lib/recommendations/reasons";
import type { RecommendationContext } from "@/lib/recommendations/service";

function emptyContext(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  return {
    userId: "user-1",
    favoriteArtistIds: [],
    topGenreSlugs: [],
    languagePreferences: [],
    moodPreferences: [],
    activityPreferences: [],
    ...overrides,
  };
}

function makeTrack(overrides: Partial<Parameters<typeof buildReasons>[0]> = {}) {
  return {
    id: "track-1",
    title: "Test Track",
    language: "ENGLISH",
    moods: [],
    activities: [],
    popularity: 50,
    album: { releaseDate: new Date("2020-01-01") },
    artists: [{ artistId: "artist-1", artist: { name: "Test Artist" } }],
    genres: [{ genre: { slug: "indie", name: "Indie" } }],
    ...overrides,
  } as Parameters<typeof buildReasons>[0];
}

describe("buildReasons", () => {
  it("always includes a popularity-based fallback reason", () => {
    const reasons = buildReasons(makeTrack(), emptyContext());
    expect(reasons.some((r) => r.explanation.code === "SIMILAR_LISTENERS")).toBe(true);
  });

  it("flags a favorite artist's older track as FAVORITE_ARTIST", () => {
    const track = makeTrack({ album: { releaseDate: new Date("2000-01-01") } });
    const context = emptyContext({ favoriteArtistIds: ["artist-1"] });
    const reasons = buildReasons(track, context);

    const top = reasons.reduce((best, r) => (r.weight > best.weight ? r : best));
    expect(top.explanation.code).toBe("FAVORITE_ARTIST");
  });

  it("flags a favorite artist's recent track as NEW_RELEASE instead", () => {
    const track = makeTrack({ album: { releaseDate: new Date() } });
    const context = emptyContext({ favoriteArtistIds: ["artist-1"] });
    const reasons = buildReasons(track, context);

    const top = reasons.reduce((best, r) => (r.weight > best.weight ? r : best));
    expect(top.explanation.code).toBe("NEW_RELEASE");
  });

  it("weighs NEW_RELEASE higher than a plain FAVORITE_ARTIST match", () => {
    const newReleaseReasons = buildReasons(
      makeTrack({ album: { releaseDate: new Date() } }),
      emptyContext({ favoriteArtistIds: ["artist-1"] }),
    );
    const oldReleaseReasons = buildReasons(
      makeTrack({ album: { releaseDate: new Date("2000-01-01") } }),
      emptyContext({ favoriteArtistIds: ["artist-1"] }),
    );

    const maxNew = Math.max(...newReleaseReasons.map((r) => r.weight));
    const maxOld = Math.max(...oldReleaseReasons.map((r) => r.weight));
    expect(maxNew).toBeGreaterThan(maxOld);
  });

  it("flags a matching frequent genre", () => {
    const context = emptyContext({ topGenreSlugs: ["indie"] });
    const reasons = buildReasons(makeTrack(), context);
    expect(reasons.some((r) => r.explanation.code === "FREQUENT_GENRE")).toBe(true);
  });

  it("flags a matching mood", () => {
    const track = makeTrack({ moods: ["FOCUS"] });
    const context = emptyContext({ moodPreferences: ["FOCUS"] as never });
    const reasons = buildReasons(track, context);
    expect(reasons.some((r) => r.explanation.code === "MOOD_MATCH")).toBe(true);
  });

  it("flags a matching activity", () => {
    const track = makeTrack({ activities: ["STUDY"] });
    const context = emptyContext({ activityPreferences: ["STUDY"] as never });
    const reasons = buildReasons(track, context);
    expect(reasons.some((r) => r.explanation.code === "ACTIVITY_MATCH")).toBe(true);
  });

  it("does not flag genre/mood/activity matches that aren't present", () => {
    const reasons = buildReasons(
      makeTrack(),
      emptyContext({ topGenreSlugs: ["jazz"], moodPreferences: ["SLEEP"] as never }),
    );
    expect(reasons.some((r) => r.explanation.code === "FREQUENT_GENRE")).toBe(false);
    expect(reasons.some((r) => r.explanation.code === "MOOD_MATCH")).toBe(false);
  });

  it("popularity fallback weight scales with track popularity", () => {
    const lowPop = buildReasons(makeTrack({ popularity: 10 }), emptyContext());
    const highPop = buildReasons(makeTrack({ popularity: 90 }), emptyContext());

    const lowWeight = lowPop.find((r) => r.explanation.code === "SIMILAR_LISTENERS")!.weight;
    const highWeight = highPop.find((r) => r.explanation.code === "SIMILAR_LISTENERS")!.weight;
    expect(highWeight).toBeGreaterThan(lowWeight);
  });
});
