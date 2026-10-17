import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteToggle } from "@/components/library/favorite-toggle";
import { Artwork } from "@/components/music/artwork";
import { TrackList } from "@/components/music/track-list";
import { PlayTrackButton } from "@/components/player/play-track-button";
import { ShareButton } from "@/components/shared/share-button";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getLikedTrackIds, isAlbumSaved } from "@/lib/library/state";
import { toDiscoveryTrack } from "@/lib/music/serializers";
import { formatDuration, titleCase } from "@/lib/utils";

type AlbumPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { id } = await params;
  const album = await prisma.album.findUnique({ where: { id }, select: { title: true } });
  return { title: album ? `${album.title} | SangeetHub` : "Album | SangeetHub" };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      primaryArtist: true,
      tracks: {
        include: {
          album: true,
          artists: { include: { artist: true } },
          genres: { include: { genre: true } },
        },
        orderBy: { title: "asc" },
      },
    },
  });

  if (!album) {
    notFound();
  }

  const session = await getAuthSession();
  const userId = session?.user?.id;
  const tracks = album.tracks.map(toDiscoveryTrack);
  const [likedIds, saved] = await Promise.all([
    getLikedTrackIds(userId, tracks.map((t) => t.id)),
    isAlbumSaved(userId, album.id),
  ]);
  const totalSeconds = tracks.reduce((sum, t) => sum + t.durationSeconds, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork
          src={album.artworkUrl}
          seed={album.id}
          alt={`${album.title} cover art`}
          className="size-48 shadow-2xl sm:size-56"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Album</p>
          <h1 className="font-display mt-1 text-4xl font-medium tracking-tight sm:text-5xl">{album.title}</h1>
          <p className="mt-3 text-base">
            <Link href={`/artists/${album.primaryArtist.id}`} className="font-medium hover:text-accent">
              {album.primaryArtist.name}
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            {titleCase(album.language)}, {new Date(album.releaseDate).getFullYear()}, {tracks.length}{" "}
            {tracks.length === 1 ? "track" : "tracks"}, {formatDuration(totalSeconds)}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tracks[0] && <PlayTrackButton track={tracks[0]} queue={tracks} label="Play album" />}
        {userId && (
          <FavoriteToggle
            endpoint={`/api/favorites/albums/${album.id}`}
            initial={saved}
            kind="save"
            subject={album.title}
            labels={{ on: "Saved", off: "Save album" }}
          />
        )}
        <ShareButton label="Share" />
      </div>

      {album.description && <p className="mt-6 max-w-2xl text-sm text-muted-foreground">{album.description}</p>}

      <div className="mt-10">
        <TrackList title="Tracks" tracks={tracks} likedTrackIds={userId ? [...likedIds] : undefined} />
      </div>
    </main>
  );
}
