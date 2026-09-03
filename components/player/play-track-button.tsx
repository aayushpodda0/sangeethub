"use client";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/player/store";
import type { DiscoveryTrack } from "@/types/music";

type PlayTrackButtonProps = {
  track: DiscoveryTrack;
  queue?: DiscoveryTrack[];
  label?: string;
};

export function PlayTrackButton({ track, queue, label = "Play" }: PlayTrackButtonProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack());
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const isCurrent = currentTrack?.id === track.id;

  function handleClick() {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queue);
    }
  }

  return (
    <Button type="button" onClick={handleClick} className="gap-2" aria-label={`Play ${track.title}`}>
      {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      {isCurrent && isPlaying ? "Pause" : label}
    </Button>
  );
}
