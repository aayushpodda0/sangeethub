import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

function topEntries<T extends string>(counts: Map<T, number>, n: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    const plays = await prisma.recentlyPlayed.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      take: 1000,
      select: {
        playedAt: true,
        track: {
          select: {
            id: true,
            title: true,
            durationSeconds: true,
            language: true,
            artists: { select: { artist: { select: { id: true, name: true } } } },
            genres: { select: { genre: { select: { slug: true, name: true } } } },
          },
        },
      },
    });

    if (plays.length === 0) {
      return apiSuccess({
        totalListeningSeconds: 0,
        totalPlays: 0,
        currentStreakDays: 0,
        topArtists: [],
        topGenres: [],
        topLanguages: [],
        topTracks: [],
        playsByDay: [],
        monthlySummary: { plays: 0, listeningSeconds: 0 },
      });
    }

    const artistCounts = new Map<string, number>();
    const artistNames = new Map<string, string>();
    const genreCounts = new Map<string, number>();
    const genreNames = new Map<string, string>();
    const languageCounts = new Map<string, number>();
    const trackCounts = new Map<string, number>();
    const trackTitles = new Map<string, string>();
    const dayCounts = new Map<string, number>();

    let totalListeningSeconds = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthlyPlays = 0;
    let monthlySeconds = 0;

    for (const play of plays) {
      totalListeningSeconds += play.track.durationSeconds;

      for (const a of play.track.artists) {
        artistCounts.set(a.artist.id, (artistCounts.get(a.artist.id) ?? 0) + 1);
        artistNames.set(a.artist.id, a.artist.name);
      }
      for (const g of play.track.genres) {
        genreCounts.set(g.genre.slug, (genreCounts.get(g.genre.slug) ?? 0) + 1);
        genreNames.set(g.genre.slug, g.genre.name);
      }
      languageCounts.set(play.track.language, (languageCounts.get(play.track.language) ?? 0) + 1);
      trackCounts.set(play.track.id, (trackCounts.get(play.track.id) ?? 0) + 1);
      trackTitles.set(play.track.id, play.track.title);

      const key = dayKey(play.playedAt);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);

      if (play.playedAt >= monthStart) {
        monthlyPlays += 1;
        monthlySeconds += play.track.durationSeconds;
      }
    }

    // Current streak: consecutive days with at least one play, counting back from today.
    let currentStreakDays = 0;
    const cursor = new Date();
    while (dayCounts.has(dayKey(cursor))) {
      currentStreakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dayKey(d);
      return { date: key, plays: dayCounts.get(key) ?? 0 };
    });

    return apiSuccess({
      totalListeningSeconds,
      totalPlays: plays.length,
      currentStreakDays,
      topArtists: topEntries(artistCounts, 5).map((e) => ({ id: e.key, name: artistNames.get(e.key)!, plays: e.count })),
      topGenres: topEntries(genreCounts, 5).map((e) => ({ slug: e.key, name: genreNames.get(e.key)!, plays: e.count })),
      topLanguages: topEntries(languageCounts, 5).map((e) => ({ language: e.key, plays: e.count })),
      topTracks: topEntries(trackCounts, 5).map((e) => ({ id: e.key, title: trackTitles.get(e.key)!, plays: e.count })),
      playsByDay: last7Days,
      monthlySummary: { plays: monthlyPlays, listeningSeconds: monthlySeconds },
    });
  } catch (error) {
    console.error("[insights] failed:", error);
    return apiError(500, "INSIGHTS_FAILED", "Couldn't load your listening insights. Please try again.");
  }
}
