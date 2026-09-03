import { notFound } from "next/navigation";

import { TrackList } from "@/components/music/track-list";
import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";

type ArtistPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      trackArtists: {
        include: {
          track: {
            include: {
              album: true,
              artists: { include: { artist: true } },
              genres: { include: { genre: true } },
            },
          },
        },
      },
    },
  });

  if (!artist) {
    notFound();
  }

  const tracks = artist.trackArtists.map((entry) => toDiscoveryTrack(entry.track));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{artist.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {[artist.city, artist.region].filter(Boolean).join(", ") || "Independent artist"}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">{artist.bio ?? "No artist bio available."}</p>
      <div className="mt-8">
        <TrackList title="Popular tracks" tracks={tracks} />
      </div>
    </main>
  );
}

