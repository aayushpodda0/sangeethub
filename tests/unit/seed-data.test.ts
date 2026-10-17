import { describe, expect, it } from "vitest";

import { ACTIVITIES, LANGUAGES, MOODS } from "@/lib/music/taxonomy";

import { ALBUMS, ALL_TRACKS, ARTISTS, GENRES, PLAYLISTS, PREVIEW_CLIPS } from "../../prisma/seed-data";

const secondsByUrl = new Map<string, number>(PREVIEW_CLIPS.map((c) => [c.url, c.seconds]));

describe("demo catalog integrity", () => {
  it("has a catalog big enough to show off discovery (not 3 songs)", () => {
    expect(ARTISTS.length).toBeGreaterThanOrEqual(15);
    expect(ALBUMS.length).toBeGreaterThanOrEqual(15);
    expect(ALL_TRACKS.length).toBeGreaterThanOrEqual(50);
  });

  it("covers every supported language with several artists and tracks", () => {
    for (const language of LANGUAGES) {
      const artists = new Set(ALBUMS.filter((a) => a.language === language).map((a) => a.artist));
      const tracks = ALL_TRACKS.filter((t) => t.language === language);
      expect(artists.size, `${language} artists`).toBeGreaterThanOrEqual(2);
      expect(tracks.length, `${language} tracks`).toBeGreaterThanOrEqual(5);
    }
  });

  it("uses unique slugs for artists, albums, tracks, genres and playlists", () => {
    for (const [name, slugs] of Object.entries({
      artists: ARTISTS.map((a) => a.slug),
      albums: ALBUMS.map((a) => a.slug),
      tracks: ALL_TRACKS.map((t) => t.slug),
      genres: GENRES.map((g) => g.slug),
      playlists: PLAYLISTS.map((p) => p.slug),
    })) {
      expect(new Set(slugs).size, `duplicate ${name} slug`).toBe(slugs.length);
    }
  });

  it("resolves every reference (album->artist, track->genre, featuring->artist)", () => {
    const artistSlugs = new Set(ARTISTS.map((a) => a.slug));
    const genreSlugs = new Set<string>(GENRES.map((g) => g.slug));
    for (const album of ALBUMS) {
      expect(artistSlugs.has(album.artist), `album ${album.slug}`).toBe(true);
      for (const track of album.tracks) {
        expect(genreSlugs.has(track.genre), `${track.slug} genre`).toBe(true);
        expect(artistSlugs.has(track.artist), `${track.slug} artist`).toBe(true);
        track.featuring.forEach((f) => expect(artistSlugs.has(f), `${track.slug} feat ${f}`).toBe(true));
      }
    }
  });

  it("only uses real enum values for moods, activities and languages", () => {
    for (const t of ALL_TRACKS) {
      expect(LANGUAGES as readonly string[]).toContain(t.language);
      t.moods.forEach((m) => expect(MOODS as readonly string[], `${t.slug} mood ${m}`).toContain(m));
      t.activities.forEach((a) => expect(ACTIVITIES as readonly string[], `${t.slug} activity ${a}`).toContain(a));
      expect(t.moods.length).toBeGreaterThan(0);
      expect(t.activities.length).toBeGreaterThan(0);
    }
  });

  it("keeps numeric metadata in sane ranges", () => {
    for (const t of ALL_TRACKS) {
      expect(t.popularity).toBeGreaterThanOrEqual(0);
      expect(t.popularity).toBeLessThanOrEqual(100);
      expect(t.tempo).toBeGreaterThanOrEqual(40);
      expect(t.tempo).toBeLessThanOrEqual(200);
    }
  });

  it("assigns each album's tracks demo clips whose real length is known (so durations stay honest)", () => {
    for (const album of ALBUMS) {
      album.tracks.forEach((_, i) => {
        const clip = PREVIEW_CLIPS[i % PREVIEW_CLIPS.length]!;
        expect(secondsByUrl.get(clip.url)).toBe(clip.seconds);
      });
    }
  });

  it("every playlist rule matches enough tracks to fill a playlist", () => {
    for (const p of PLAYLISTS) {
      const matches = ALL_TRACKS.filter(
        (t) => t.moods.some((m) => p.matchMoods.includes(m)) || t.activities.some((a) => p.matchActivities.includes(a)),
      );
      expect(matches.length, p.slug).toBeGreaterThanOrEqual(5);
    }
  });

  it("includes a few albums released recently, so New Releases and 'new release' recommendations have data", () => {
    expect(ALBUMS.filter((a) => a.releasedDaysAgo <= 30).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the three original track slugs (existing users' history/likes stay valid)", () => {
    const slugs = new Set(ALL_TRACKS.map((t) => t.slug));
    for (const original of ["city-lights-raag", "morning-filter-coffee", "monsoon-metro"]) {
      expect(slugs.has(original)).toBe(true);
    }
  });
});
