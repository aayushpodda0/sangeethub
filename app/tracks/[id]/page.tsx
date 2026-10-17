import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FavoriteToggle } from "@/components/library/favorite-toggle";
import { Artwork } from "@/components/music/artwork";
import { QueueButton } from "@/components/music/queue-button";
import { TrackList } from "@/components/music/track-list";
import { PlayTrackButton } from "@/components/player/play-track-button";
import { AddToPlaylistMenu } from "@/components/playlists/add-to-playlist-menu";
import { ShareButton } from "@/components/shared/share-button";
import { getAuthSession } from "@/lib/auth/session";
import { getLikedTrackIds } from "@/lib/library/state";
import { DemoMusicProvider } from "@/lib/music/demo-provider";
import { formatDuration, titleCase } from "@/lib/utils";

// Tracks are resolved through the MusicProvider so a licensed streaming API can replace the demo
// catalog without touching this page.
const provider = new DemoMusicProvider();

type TrackPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await provider.getTrackById(id);
  return { title: track ? `${track.title} | SangeetHub` : "Track | SangeetHub" };
}

function Facts({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-border px-2.5 py-1 text-xs">
            {item}
          </span>
        ))}
      </dd>
    </div>
  );
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = await provider.getTrackById(id);

  if (!track) {
    notFound();
  }

  const session = await getAuthSession();
  const userId = session?.user?.id;
  const similar = await provider.getSimilarTracks(id, 6);
  const likedIds = await getLikedTrackIds(userId, [track.id, ...similar.map((t) => t.id)]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork
          src={track.artworkUrl}
          seed={track.id}
          alt={`${track.title} cover art`}
          className="size-48 shadow-2xl sm:size-56"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Track</p>
          <h1 className="font-display mt-1 text-4xl font-medium tracking-tight sm:text-5xl">{track.title}</h1>
          <p className="mt-3 text-base font-medium">{track.artistNames.join(", ")}</p>
          <p className="text-sm text-muted-foreground">{track.albumTitle}</p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <PlayTrackButton track={track} queue={[track]} label="Play track" />
        {userId && (
          <FavoriteToggle
            endpoint={`/api/favorites/tracks/${track.id}`}
            initial={likedIds.has(track.id)}
            kind="like"
            subject={track.title}
            labels={{ on: "Liked", off: "Like" }}
          />
        )}
        <QueueButton track={track} variant="button" />
        {userId && <AddToPlaylistMenu trackId={track.id} />}
        <ShareButton label="Share" />
      </div>

      <dl className="mt-8 grid gap-5 sm:grid-cols-2">
        <Facts label="Language" items={[titleCase(track.language)]} />
        <Facts label="Genre" items={track.genreNames} />
        <Facts label="Mood" items={track.moods.map(titleCase)} />
        <Facts label="Good for" items={track.activities.map(titleCase)} />
        <Facts label="Length" items={[formatDuration(track.durationSeconds)]} />
      </dl>

      {similar.length > 0 && (
        <div className="mt-12">
          <TrackList
            title="Similar tracks"
            tracks={similar}
            likedTrackIds={userId ? [...likedIds] : undefined}
          />
        </div>
      )}
    </main>
  );
}
