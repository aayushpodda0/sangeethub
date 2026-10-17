"use client";

import { FavoriteToggle } from "@/components/library/favorite-toggle";
import { QueueButton } from "@/components/music/queue-button";
import type { DiscoveryTrack } from "@/types/music";

/** Compact per-row actions. `liked` is undefined for signed-out visitors, which hides the heart. */
export function TrackActions({ track, liked }: { track: DiscoveryTrack; liked?: boolean }) {
  return (
    <div className="flex items-center">
      {liked !== undefined && (
        <FavoriteToggle
          endpoint={`/api/favorites/tracks/${track.id}`}
          initial={liked}
          kind="like"
          subject={track.title}
          variant="icon"
          labels={{ on: "Liked", off: "Like" }}
        />
      )}
      <QueueButton track={track} />
    </div>
  );
}
