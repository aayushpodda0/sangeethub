"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";

import { PlayerBar } from "@/components/player/player-bar";
import { PlayerEngineProvider } from "@/components/player/player-engine-context";
import { NowPlaying } from "@/components/player/now-playing";
import { usePlayerStore } from "@/lib/player/store";

export function PlayerShell({ children }: PropsWithChildren) {
  const hasTrack = usePlayerStore((state) => state.currentTrack() !== null);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  return (
    <PlayerEngineProvider>
      <div className={hasTrack ? "pb-28" : undefined}>{children}</div>
      <PlayerBar onExpand={() => setNowPlayingOpen(true)} />
      <NowPlaying open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} />
    </PlayerEngineProvider>
  );
}
