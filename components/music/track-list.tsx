import Link from "next/link";

import { PlayTrackButton } from "@/components/player/play-track-button";
import { formatDuration } from "@/lib/utils";
import type { DiscoveryTrack } from "@/types/music";

type TrackListProps = {
  title: string;
  tracks: DiscoveryTrack[];
  /** Shows a rank number per row - only turn on for genuinely ranked lists (e.g. popularity charts). */
  ranked?: boolean;
};

export function TrackList({ title, tracks, ranked = false }: TrackListProps) {
  return (
    <section>
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      {!tracks.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No tracks available.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {tracks.map((track, index) => (
            <li key={track.id} className="flex items-center gap-4 py-3">
              {ranked && (
                <span className="font-display w-6 shrink-0 text-right text-lg text-muted-foreground/70">
                  {index + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/tracks/${track.id}`} className="truncate text-sm font-medium hover:text-accent">
                  {track.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {track.artistNames.join(", ")}
                  <span className="mx-1.5 text-border">/</span>
                  {track.albumTitle}
                  <span className="mx-1.5 text-border">/</span>
                  {track.language.charAt(0) + track.language.slice(1).toLowerCase()}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                {formatDuration(track.durationSeconds)}
              </span>
              <PlayTrackButton track={track} queue={tracks} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
