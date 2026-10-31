import type { Activity, LanguageCode, Mood, Prisma } from "@prisma/client";

import type { SmartPlaylistRules } from "@/lib/playlists/schemas";

function toReleaseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Smart playlist contains an invalid release date.");
  }
  return date;
}

export function buildSmartPlaylistWhere(rules: SmartPlaylistRules, userId: string): Prisma.TrackWhereInput {
  return {
    AND: rules.map((rule) => {
      switch (rule.field) {
        case "genre":
          return { genres: { some: { genre: { OR: [{ slug: rule.value }, { name: rule.value }] } } } };
        case "language":
          return { language: rule.value as LanguageCode };
        case "mood":
          return { moods: { has: rule.value as Mood } };
        case "activity":
          return { activities: { has: rule.value as Activity } };
        case "artist":
          return { artists: { some: { artist: { OR: [{ id: rule.value }, { slug: rule.value }] } } } };
        case "liked":
          return rule.value ? { favoritedBy: { some: { userId } } } : { favoritedBy: { none: { userId } } };
        case "recentlyPlayed":
          return {
            recentPlays: {
              some: { userId, playedAt: { gte: new Date(Date.now() - rule.withinDays * 24 * 60 * 60 * 1000) } },
            },
          };
        case "releaseDate":
          return {
            releaseDate: { [rule.operator === "after" ? "gte" : "lte"]: toReleaseDate(rule.value) },
          };
      }
    }),
  };
}
