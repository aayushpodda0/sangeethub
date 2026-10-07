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
  const firstName = (session.user.name ?? session.user.username ?? "there").split(" ")[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-6 sm:px-6">
      {/* Hero */}
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-border">
        <div
          className="absolute inset-0 opacity-90"
          style={{ backgroundImage: "var(--gradient-sunset)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-background/10" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-6 px-6 py-10 sm:px-10 sm:py-14">
          <div>
            <p className="text-sm font-medium text-accent-foreground/80">Good to see you</p>
            <h1 className="font-display mt-1 text-4xl font-medium tracking-tight text-accent-foreground sm:text-5xl">
              {firstName}
            </h1>
            <p className="mt-3 max-w-md text-sm text-accent-foreground/85">
              Discover music across moods, languages, and regional scenes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/search">Search</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      {recommendationCards.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl font-medium">Made for you</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommendationCards.map((card) => (
              <Link
                key={card.trackId}
                href={`/tracks/${card.trackId}`}
                className="group rounded-xl border-l-2 border-accent bg-card p-4 transition hover:bg-muted"
              >
                <p className="truncate text-sm font-medium group-hover:text-accent">{card.trackTitle}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{card.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <TrackList title="Trending regional music" tracks={trendingTracks} ranked />

        <aside className="space-y-8">
          <section>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
              Recommended playlists
            </h2>
            <ul className="mt-3 space-y-3">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <Link href={`/playlists/${playlist.id}`} className="text-sm font-medium hover:text-accent">
                    {playlist.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {playlist.isPublic ? "Public" : "Private"}, by{" "}
                    {playlist.owner.name ?? playlist.owner.username}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
              Featured independent artists
            </h2>
            <ul className="mt-3 space-y-3">
              {artists.map((artist) => (
                <li key={artist.id}>
                  <Link href={`/artists/${artist.id}`} className="text-sm font-medium hover:text-accent">
                    {artist.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[artist.city, artist.region].filter(Boolean).join(", ") || "India"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">New releases</h2>
            <ul className="mt-3 space-y-3">
              {albums.map((album) => (
                <li key={album.id}>
                  <Link href={`/albums/${album.id}`} className="text-sm font-medium hover:text-accent">
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
