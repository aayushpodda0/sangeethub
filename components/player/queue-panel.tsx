"use client";

import { GripVertical, ListMusic, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/player/store";
import { cn } from "@/lib/utils";

export function QueuePanel() {
  const [open, setOpen] = useState(false);
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const reorderQueue = usePlayerStore((state) => state.reorderQueue);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle queue"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ListMusic className="size-5" />
      </Button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-3 max-h-96 w-80 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl"
          role="region"
          aria-label="Playback queue"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Queue</h2>
            <span className="text-xs text-muted-foreground">{queue.length} tracks</span>
          </div>

          {queue.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted-foreground">Your queue is empty.</p>
          ) : (
            <ul className="space-y-1">
              {queue.map((track, index) => (
                <li
                  key={`${track.id}-${index}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) {
                      reorderQueue(dragIndex, index);
                    }
                    setDragIndex(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2 py-2 text-sm",
                    index === currentIndex ? "bg-accent/10 font-medium" : "hover:bg-muted",
                  )}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{track.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {track.artistNames.join(", ")}
                    </p>
                  </div>
                  {index !== currentIndex && (
                    <button
                      type="button"
                      aria-label={`Remove ${track.title} from queue`}
                      onClick={() => removeFromQueue(index)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
