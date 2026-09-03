import { notFound } from "next/navigation";

import { PlayTrackButton } from "@/components/player/play-track-button";
import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";

type TrackPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      album: true,
      artists: { include: { artist: true } },
      genres: { include: { genre: true } },
    },
  });

  if (!track) {
    notFound();
  }

  const mapped = toDiscoveryTrack(track);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{mapped.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mapped.artistNames.join(", ")} • {mapped.albumTitle}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-border px-3 py-1">{mapped.language}</span>
        {mapped.genreNames.map((genre) => (
          <span key={genre} className="rounded-full border border-border px-3 py-1">
            {genre}
          </span>
        ))}
      </div>
      <div className="mt-6">
        <PlayTrackButton track={mapped} label="Play track" />
      </div>
    </main>
  );
}

