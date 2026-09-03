import Link from "next/link";

import { PlayTrackButton } from "@/components/player/play-track-button";
import type { DiscoveryTrack } from "@/types/music";

type TrackListProps = {
  title: string;
  tracks: DiscoveryTrack[];
};

export function TrackList({ title, tracks }: TrackListProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {!tracks.length ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No tracks available.
        </div>
      ) : (
        <ul className="space-y-2">
          {tracks.map((track) => (
            <li
              key={track.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <Link href={`/tracks/${track.id}`} className="truncate text-sm font-medium hover:underline">
                  {track.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artistNames.join(", ")} • {track.albumTitle} • {track.language}
                </p>
              </div>
              <PlayTrackButton track={track} queue={tracks} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

