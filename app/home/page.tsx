import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/signout-button";
import { TrackList } from "@/components/music/track-list";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/session";
import { toDiscoveryTrack } from "@/lib/music/serializers";
import { buildRecommendationContext } from "@/lib/recommendations/context";
import { DeterministicRecommendationService } from "@/lib/recommendations/deterministic-service";

export const metadata: Metadata = {
  title: "Home | SangeetHub",
};

const recommendationService = new DeterministicRecommendationService();

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [trending, playlists, artists, albums, recommendationContext] = await Promise.all([
    prisma.track.findMany({
      include: {
        album: true,
        artists: { include: { artist: true } },
        genres: { include: { genre: true } },
      },
      orderBy: [{ popularity: "desc" }, { releaseDate: "desc" }],
      take: 8,
    }),
    prisma.playlist.findMany({
      where: {
        OR: [{ ownerId: session.user.id }, { isPublic: true }],
      },
      include: {
        owner: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6,
    }),
    prisma.artist.findMany({
      orderBy: [{ popularity: "desc" }],
      take: 6,
    }),
    prisma.album.findMany({
      include: { primaryArtist: true },
      orderBy: [{ releaseDate: "desc" }],
      take: 6,
    }),
    buildRecommendationContext(session.user.id),
  ]);

  const recommendationResults = await recommendationService.getTrackRecommendations(recommendationContext);
  const recommendedTrackIds = recommendationResults.slice(0, 4).map((r) => r.trackId);
  const recommendedTracks =
    recommendedTrackIds.length > 0
      ? await prisma.track.findMany({
          where: { id: { in: recommendedTrackIds } },
          select: { id: true, title: true },
        })
      : [];
  const trackTitleById = new Map(recommendedTracks.map((t) => [t.id, t.title]));

  const recommendationCards = recommendationResults.slice(0, 4).map((r) => ({
    trackId: r.trackId,
    trackTitle: trackTitleById.get(r.trackId) ?? "",
    ...r.explanation,
  }));

  const trendingTracks = trending.map(toDiscoveryTrack);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {session.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            Discover music across moods, languages, and regional scenes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/search">Search</Link>
          </Button>
          <SignOutButton />
        </div>
      </header>

      {recommendationCards.length > 0 && (
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recommendationCards.map((card) => (
            <Link
              key={card.trackId}
              href={`/tracks/${card.trackId}`}
              className="rounded-xl border border-border bg-card p-4 transition hover:border-accent/50"
            >
              <p className="text-xs uppercase tracking-wide text-accent">{card.title}</p>
              <p className="mt-2 truncate text-sm font-medium">{card.trackTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <TrackList title="Trending regional music" tracks={trendingTracks} />

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended playlists
            </h2>
            <ul className="mt-3 space-y-2">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <Link href={`/playlists/${playlist.id}`} className="text-sm font-medium hover:underline">
                    {playlist.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {playlist.isPublic ? "Public" : "Private"} • by{" "}
                    {playlist.owner.name ?? playlist.owner.username}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Featured independent artists
            </h2>
            <ul className="mt-3 space-y-2">
              {artists.map((artist) => (
                <li key={artist.id}>
                  <Link href={`/artists/${artist.id}`} className="text-sm font-medium hover:underline">
                    {artist.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[artist.city, artist.region].filter(Boolean).join(", ") || "India"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              New releases
            </h2>
            <ul className="mt-3 space-y-2">
              {albums.map((album) => (
                <li key={album.id}>
                  <Link href={`/albums/${album.id}`} className="text-sm font-medium hover:underline">
                    {album.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{album.primaryArtist.name}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

