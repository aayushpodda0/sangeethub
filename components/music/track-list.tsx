import Link from "next/link";

import { Artwork } from "@/components/music/artwork";
import { TrackActions } from "@/components/music/track-actions";
import { PlayTrackButton } from "@/components/player/play-track-button";
import { formatDuration, titleCase } from "@/lib/utils";
import type { DiscoveryTrack } from "@/types/music";

type TrackListProps = {
  title: string;
  tracks: DiscoveryTrack[];
  /** Shows a rank number per row - only turn on for genuinely ranked lists (e.g. popularity charts). */
  ranked?: boolean;
  /** Ids the signed-in user has liked. Omit for signed-out visitors (hides the heart). */
  likedTrackIds?: string[];
};

export function TrackList({ title, tracks, ranked = false, likedTrackIds }: TrackListProps) {
  const liked = likedTrackIds ? new Set(likedTrackIds) : null;

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
            <li
              key={track.id}
              className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-muted/70 sm:gap-4"
            >
              {ranked && (
                <span className="font-display w-6 shrink-0 text-right text-lg text-muted-foreground/70">
                  {index + 1}
                </span>
              )}
              <Artwork
                src={track.artworkUrl}
                seed={track.id}
                alt={`${track.title} cover art`}
                className="size-12 rounded-lg shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/tracks/${track.id}`}
                  className="block truncate text-sm font-semibold hover:text-accent"
                >
                  {track.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {track.artistNames.join(", ")}
                  <span className="mx-1.5 text-border">/</span>
                  {track.albumTitle}
                  <span className="mx-1.5 text-border">/</span>
                  {titleCase(track.language)}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                {formatDuration(track.durationSeconds)}
              </span>
              <TrackActions track={track} liked={liked ? liked.has(track.id) : undefined} />
              <PlayTrackButton track={track} queue={tracks} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
