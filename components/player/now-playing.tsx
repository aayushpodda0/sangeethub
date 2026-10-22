"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useEffect } from "react";

import { AddToPlaylistMenu } from "@/components/playlists/add-to-playlist-menu";
import { Artwork } from "@/components/music/artwork";
import { FavoriteToggle } from "@/components/library/favorite-toggle";
import { ShareButton } from "@/components/shared/share-button";
import { Button } from "@/components/ui/button";
import { usePlayerEngine } from "@/components/player/player-engine-context";
import { usePlayerStore } from "@/lib/player/store";
import { formatDuration } from "@/lib/utils";

async function fetchLikedTrackIds(): Promise<string[]> {
  const response = await fetch("/api/library");
  if (!response.ok) return [];
  const body = (await response.json()) as {
    data?: { likedTracks?: { track: { id: string } }[] };
  };
  return body.data?.likedTracks?.map(({ track }) => track.id) ?? [];
}

export function NowPlaying({ open, onClose }: { open: boolean; onClose: () => void }) {
  const track = usePlayerStore((state) => state.currentTrack());
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const { progress, duration, isLoading, seek } = usePlayerEngine();
  const likedTracks = useQuery({
    queryKey: ["library", "liked-track-ids"],
    queryFn: fetchLikedTrackIds,
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open || !track) return null;

  const upcoming = queue.slice(currentIndex + 1, currentIndex + 4);

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-background/98 px-4 py-5 backdrop-blur sm:px-8 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="now-playing-title"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Close now playing" onClick={onClose}>
            <ChevronDown className="size-6" />
          </Button>
          <p className="eyebrow">Now playing</p>
          <Button variant="ghost" size="icon" aria-label="Close now playing" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <section className="mx-auto w-full max-w-xl text-center">
            <Artwork
              src={track.artworkUrl}
              seed={track.id}
              alt={`${track.title} artwork`}
              className="mx-auto aspect-square w-full max-w-[min(72vw,26rem)] rounded-[2rem] shadow-[var(--shadow-surface)]"
            />
            <div className="mt-7 text-left">
              <h1 id="now-playing-title" className="font-display truncate text-3xl font-medium sm:text-4xl">
                {track.title}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{track.artistNames.join(", ")}</p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{formatDuration(progress)}</span>
              <input
                type="range"
                min={0}
                max={duration || track.durationSeconds || 0}
                value={Math.min(progress, duration || track.durationSeconds || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Seek through current track"
                className="h-1.5 flex-1 cursor-pointer accent-accent"
              />
              <span className="w-10 text-xs tabular-nums text-muted-foreground">{formatDuration(duration || track.durationSeconds)}</span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle}>
                <Shuffle className="size-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Previous track" onClick={playPrevious}>
                <SkipBack className="size-6" />
              </Button>
              <Button variant="default" size="icon" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} disabled={isLoading} className="size-14">
                {isPlaying ? <Pause className="size-6" /> : <Play className="size-6" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Next track" onClick={playNext}>
                <SkipForward className="size-6" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat !== "off"} onClick={cycleRepeat}>
                {repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <FavoriteToggle
                key={`${track.id}-${likedTracks.data?.includes(track.id) ?? false}`}
                endpoint={`/api/favorites/tracks/${track.id}`}
                initial={likedTracks.data?.includes(track.id) ?? false}
                kind="like"
                subject={track.title}
                labels={{ on: "Liked", off: "Like" }}
              />
              <AddToPlaylistMenu trackId={track.id} />
              <ShareButton label="Share" />
            </div>
          </section>

          <aside className="surface-card p-4">
            <h2 className="text-sm font-semibold">Up next</h2>
            <p className="mt-1 text-xs text-muted-foreground">{upcoming.length ? `${upcoming.length} queued tracks` : "The queue is empty after this track."}</p>
            <ul className="mt-4 space-y-2">
              {upcoming.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl p-2">
                  <Artwork src={item.artworkUrl} seed={item.id} alt="" decorative className="size-10 rounded-lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.artistNames.join(", ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
