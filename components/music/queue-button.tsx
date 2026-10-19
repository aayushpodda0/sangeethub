"use client";

import { ListPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/player/store";
import type { DiscoveryTrack } from "@/types/music";

/**
 * Adds a track to the playback queue. If nothing is playing there's no visible queue yet,
 * so it starts the track instead and says so.
 */
export function QueueButton({
  track,
  variant = "icon",
}: {
  track: DiscoveryTrack;
  variant?: "icon" | "button";
}) {
  const hasCurrent = usePlayerStore((state) => state.currentTrack() !== null);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const playTrack = usePlayerStore((state) => state.playTrack);

  function handleClick() {
    if (!hasCurrent) {
      playTrack(track, [track]);
      toast.success(`Playing ${track.title}`);
    } else {
      addToQueue(track);
      toast.success(`Added to queue: ${track.title}`);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={`Add ${track.title} to queue`}
        onClick={handleClick}
        className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ListPlus className="size-4" />
      </button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} className="gap-2">
      <ListPlus className="size-4" />
      Add to queue
    </Button>
  );
}
