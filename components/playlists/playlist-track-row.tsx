"use client";

import { GripVertical, Pause, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/player/store";
import { cn, formatDuration } from "@/lib/utils";
import type { DiscoveryTrack } from "@/types/music";

export type PlaylistTrackEntry = {
  playlistTrackId: string;
  position: number;
  addedBy: { id: string; name: string | null; username: string };
  canRemove: boolean;
  track: DiscoveryTrack;
};

type Props = {
  entry: PlaylistTrackEntry;
  index: number;
  allTracks: DiscoveryTrack[];
  canReorder: boolean;
  onRemove: (playlistTrackId: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (index: number) => void;
};

export function PlaylistTrackRow({
  entry,
  index,
  allTracks,
  canReorder,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: Props) {
  const currentTrack = usePlayerStore((state) => state.currentTrack());
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const isCurrent = currentTrack?.id === entry.track.id;

  return (
    <li
      draggable={canReorder}
      onDragStart={() => canReorder && onDragStart(index)}
      onDragOver={canReorder ? onDragOver : undefined}
      onDrop={() => canReorder && onDrop(index)}
      className={cn("flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted", isCurrent && "bg-accent/10")}
    >
      {canReorder ? (
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
      ) : (
        <span className="w-4 shrink-0" />
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label={isCurrent && isPlaying ? `Pause ${entry.track.title}` : `Play ${entry.track.title}`}
        onClick={() => (isCurrent ? togglePlay() : playTrack(entry.track, allTracks))}
        className="shrink-0"
      >
        {isCurrent && isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>

      <div className="size-10 shrink-0 rounded-lg bg-gradient-to-br from-accent to-secondary" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isCurrent && "text-accent")}>{entry.track.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.track.artistNames.join(", ")} • added by {entry.addedBy.name ?? entry.addedBy.username}
        </p>
      </div>

      <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
        {formatDuration(entry.track.durationSeconds)}
      </span>

      {entry.canRemove && (
        <button
          type="button"
          aria-label={`Remove ${entry.track.title} from playlist`}
          onClick={() => onRemove(entry.playlistTrackId)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      )}
    </li>
  );
}
