"use client";

import { ListPlus, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ProviderTrack } from "@/lib/music/provider";
import { usePlayerStore } from "@/lib/player/store";
import { cn, formatDuration } from "@/lib/utils";

export function TrackRow({ track, tracks }: { track: ProviderTrack; tracks: ProviderTrack[] }) {
  const currentTrack = usePlayerStore((state) => state.currentTrack());
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNextInQueue = usePlayerStore((state) => state.playNextInQueue);

  const isCurrent = currentTrack?.id === track.id;

  function handlePlayToggle() {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-muted",
        isCurrent && "bg-accent/10",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={handlePlayToggle}
        className="shrink-0"
      >
        {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>

      <div
        className="size-10 shrink-0 rounded-lg bg-gradient-to-br from-accent to-secondary"
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isCurrent && "text-accent")}>{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artistName} • {track.albumTitle}
        </p>
      </div>

      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{track.language}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatDuration(track.durationSeconds)}
      </span>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Play ${track.title} next`}
        onClick={() => playNextInQueue(track)}
        className="shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <ListPlus className="size-4" />
      </Button>
    </li>
  );
}
