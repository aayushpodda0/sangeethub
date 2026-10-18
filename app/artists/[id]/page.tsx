import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteToggle } from "@/components/library/favorite-toggle";
import { Artwork } from "@/components/music/artwork";
import { TrackList } from "@/components/music/track-list";
import { ShareButton } from "@/components/shared/share-button";
import { getAuthSession } from "@/lib/auth/session";
import { getLikedTrackIds, isFollowingArtist } from "@/lib/library/state";
import { musicService } from "@/lib/music/service";
import { titleCase } from "@/lib/utils";

type ArtistPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { id } = await params;
  const artist = await musicService.getArtistById(id);
  return { title: artist ? `${artist.name} | SangeetHub` : "Artist | SangeetHub" };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;

  const artist = await musicService.getArtistById(id);

  if (!artist) {
    notFound();
  }

  const session = await getAuthSession();
  const userId = session?.user?.id;
  const popular = artist.trackArtists
    .map((entry) => musicService.toDiscoveryTrack(entry.track))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 10);
  const [likedIds, following] = await Promise.all([
    getLikedTrackIds(userId, popular.map((t) => t.id)),
    isFollowingArtist(userId, artist.id),
  ]);
  const languages = [...new Set(popular.map((t) => titleCase(t.language)))];

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork
          src={artist.imageUrl}
          seed={artist.id}
          alt={`${artist.name}`}
          round
          className="size-44 shadow-2xl sm:size-52"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{artist.isIndependent ? "Independent artist" : "Artist"}</p>
          <h1 className="font-display mt-1 text-4xl font-medium tracking-tight sm:text-5xl">{artist.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {[artist.city, artist.region].filter(Boolean).join(", ") || "India"}
            {languages.length > 0 && `. Sings in ${languages.join(", ")}`}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {userId && (
          <FavoriteToggle
            endpoint={`/api/favorites/artists/${artist.id}`}
            initial={following}
            kind="follow"
            subject={artist.name}
            labels={{ on: "Following", off: "Follow" }}
          />
        )}
        <ShareButton label="Share" />
      </div>

      {artist.bio && <p className="mt-6 max-w-2xl text-sm text-muted-foreground">{artist.bio}</p>}

      <div className="mt-10">
        <TrackList title="Popular tracks" tracks={popular} ranked likedTrackIds={userId ? [...likedIds] : undefined} />
      </div>

      {artist.albums.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-medium">Albums</h2>
          <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {artist.albums.map((album) => (
              <li key={album.id}>
                <Link href={`/albums/${album.id}`} className="group block">
                  <Artwork
                    src={album.artworkUrl}
                    seed={album.id}
                    alt={`${album.title} cover art`}
                    className="aspect-square w-full shadow-lg transition group-hover:-translate-y-0.5"
                  />
                  <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">{album.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(album.releaseDate).getFullYear()}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
