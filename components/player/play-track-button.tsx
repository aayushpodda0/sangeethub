"use client";

import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { PlayerTrack } from "@/types/music";

type PlayTrackButtonProps = {
  track: PlayerTrack;
  queue?: PlayerTrack[];
  label?: string;
};

export function PlayTrackButton({ track, queue, label = "Play" }: PlayTrackButtonProps) {
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <Button
      type="button"
      onClick={() => playTrack(track, queue)}
      className="gap-2"
      aria-label={`Play ${track.title}`}
    >
      <Play className="size-4" />
      {label}
    </Button>
  );
}

