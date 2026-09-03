"use client";

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect } from "react";

import { QueuePanel } from "@/components/player/queue-panel";
import { Button } from "@/components/ui/button";
import { useAudioEngine } from "@/lib/player/use-audio-engine";
import { usePlayerStore } from "@/lib/player/store";
import { cn, formatDuration as formatTime } from "@/lib/utils";

export function PlayerBar() {
  const track = usePlayerStore((state) => state.currentTrack());
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const error = usePlayerStore((state) => state.error);

  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);

  const { progress, duration, isLoading, seek } = useAudioEngine();

  // Keyboard shortcuts: space = play/pause, arrows = seek/skip.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping || !track) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight" && e.shiftKey) {
        playNext();
      } else if (e.code === "ArrowLeft" && e.shiftKey) {
        playPrevious();
      } else if (e.code === "ArrowRight") {
        seek(Math.min(duration, progress + 5));
      } else if (e.code === "ArrowLeft") {
        seek(Math.max(0, progress - 5));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [track, togglePlay, playNext, playPrevious, seek, progress, duration]);

  if (!track) {
    return null;
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      role="region"
      aria-label="Now playing"
    >
      {error && (
        <p className="bg-destructive/10 px-4 py-1 text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6">
        {/* Seek bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-10 text-right tabular-nums">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(progress, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-accent"
          />
          <span className="w-10 tabular-nums">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="size-11 shrink-0 rounded-lg bg-gradient-to-br from-accent to-secondary"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{track.title}</p>
              <p className="truncate text-xs text-muted-foreground">{track.artistNames.join(", ")}</p>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Shuffle"
              aria-pressed={shuffle}
              onClick={toggleShuffle}
              className={cn(shuffle && "text-accent")}
            >
              <Shuffle className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Previous track" onClick={playPrevious}>
              <SkipBack className="size-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={isLoading}
              className="rounded-full"
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next track" onClick={playNext}>
              <SkipForward className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Repeat: ${repeat}`}
              aria-pressed={repeat !== "off"}
              onClick={cycleRepeat}
              className={cn(repeat !== "off" && "text-accent")}
            >
              {repeat === "one" ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
            </Button>
          </div>

          {/* Volume + queue */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" size="icon" aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute}>
              <VolumeIcon className="size-4" />
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-muted accent-accent sm:block"
            />
            <QueuePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
