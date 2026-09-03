import { notFound } from "next/navigation";

import { TrackList } from "@/components/music/track-list";
import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";

type AlbumPageProps = {
  params: Promise<{ id: string }>;
};

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

  const tracks = album.tracks.map(toDiscoveryTrack);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{album.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {album.primaryArtist.name} • {album.language} • {new Date(album.releaseDate).getFullYear()}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">{album.description ?? "No description available."}</p>
      <div className="mt-8">
        <TrackList title="Album tracks" tracks={tracks} />
      </div>
    </main>
  );
}

