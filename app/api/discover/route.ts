import type { Activity, LanguageCode, Mood } from "@prisma/client";

import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mood = searchParams.get("mood") as Mood | null;
  const activity = searchParams.get("activity") as Activity | null;
  const language = searchParams.get("language") as LanguageCode | null;

  try {
    const tracks = await prisma.track.findMany({
      where: {
        ...(mood ? { moods: { has: mood } } : {}),
        ...(activity ? { activities: { has: activity } } : {}),
        ...(language ? { language } : {}),
      },
      include: {
        album: true,
        artists: { include: { artist: true } },
        genres: { include: { genre: true } },
      },
      orderBy: { popularity: "desc" },
      take: 30,
    });

    return apiSuccess({ tracks: tracks.map(toDiscoveryTrack) });
  } catch (error) {
    console.error("[discover] failed:", error);
    return apiError(500, "DISCOVER_FAILED", "Couldn't load discovery results. Please try again.");
  }
}
