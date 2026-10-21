import type { Metadata } from "next";
import { Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Artwork } from "@/components/music/artwork";
import { TrackList } from "@/components/music/track-list";
import { prisma } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/session";
import { getLikedTrackIds } from "@/lib/library/state";
import { musicService } from "@/lib/music/service";
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
    musicService.getTrendingTracks(8),
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
    musicService.getFeaturedArtists(6),
    musicService.getNewReleases(6),
    buildRecommendationContext(session.user.id),
  ]);

  const recommendationResults =
    await recommendationService.getTrackRecommendations(recommendationContext);
  const recommendedTrackIds = recommendationResults.slice(0, 4).map((r) => r.trackId);
  const recommendedTracks = await musicService.getTracksByIds(recommendedTrackIds);
  const trackTitleById = new Map(recommendedTracks.map((t) => [t.id, t.title]));

  const recommendationCards = recommendationResults.slice(0, 4).map((r) => ({
    trackId: r.trackId,
    trackTitle: trackTitleById.get(r.trackId) ?? "",
    ...r.explanation,
  }));

  const trendingTracks = trending;
  const likedIds = await getLikedTrackIds(
    session.user.id,
    trendingTracks.map((t) => t.id),
  );
  const firstName = (session.user.name ?? session.user.username ?? "there").split(" ")[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-6 sm:px-6">
      {/* Hero */}
      <header className="relative mb-10 overflow-hidden rounded-[2rem] border border-border shadow-[var(--shadow-surface)]">
        <div
          className="absolute inset-0 opacity-90"
          style={{ backgroundImage: "var(--gradient-sunset)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/25" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-6 px-6 py-8 sm:px-10 sm:py-11">
          <div>
            <p className="text-sm font-medium text-accent-foreground">Good to see you</p>
            <h1 className="font-display mt-1 text-4xl font-medium tracking-tight text-accent-foreground sm:text-5xl">
              {firstName}
            </h1>
            <p className="mt-3 max-w-md text-sm text-accent-foreground">
              Discover music across moods, languages, and regional scenes.
            </p>
          </div>
          <Link
            href="/search"
            className="flex w-full max-w-sm items-center gap-3 rounded-full bg-black/30 px-5 py-3 text-sm text-accent-foreground backdrop-blur transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Search className="size-4" aria-hidden />
            Search songs, artists, moods
          </Link>
        </div>
      </header>

      {recommendationCards.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl font-medium">Made for you</h2>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3">
            {recommendationCards.map((card) => (
              <Link
                key={card.trackId}
                href={`/tracks/${card.trackId}`}
                className="group surface-card rounded-xl border-l-2 border-accent p-4 transition hover:-translate-y-0.5 hover:bg-muted"
              >
                <p className="truncate text-sm font-medium group-hover:text-accent">
                  {card.trackTitle}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {card.detail}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <TrackList
          title="Trending regional music"
          tracks={trendingTracks}
          ranked
          likedTrackIds={[...likedIds]}
        />

        <aside className="space-y-8">
          <section>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
              Recommended playlists
            </h2>
            <ul className="mt-3 space-y-3">
              {playlists.map((playlist) => (
                <li key={playlist.id} className="flex items-center gap-3">
                  <Artwork
                    src={playlist.coverUrl}
                    seed={playlist.id}
                    alt=""
                    decorative
                    className="size-10"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/playlists/${playlist.id}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      {playlist.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {playlist.isPublic ? "Public" : "Private"}, by{" "}
                      {playlist.owner.name ?? playlist.owner.username}
                    </p>
                  </div>
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
                <li key={artist.id} className="flex items-center gap-3">
                  <Artwork
                    src={artist.imageUrl}
                    seed={artist.id}
                    alt=""
                    decorative
                    round
                    className="size-10"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/artists/${artist.id}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      {artist.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[artist.city, artist.region].filter(Boolean).join(", ") || "India"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
              New releases
            </h2>
            <ul className="mt-3 space-y-3">
              {albums.map((album) => (
                <li key={album.id} className="flex items-center gap-3">
                  <Artwork
                    src={album.artworkUrl}
                    seed={album.id}
                    alt=""
                    decorative
                    className="size-10"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/albums/${album.id}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      {album.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{album.primaryArtist.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
