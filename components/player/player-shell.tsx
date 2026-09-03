"use client";

import type { PropsWithChildren } from "react";

import { PlayerBar } from "@/components/player/player-bar";
import { usePlayerStore } from "@/lib/player/store";

export function PlayerShell({ children }: PropsWithChildren) {
  const hasTrack = usePlayerStore((state) => state.currentTrack() !== null);

  return (
    <>
      <div className={hasTrack ? "pb-28" : undefined}>{children}</div>
      <PlayerBar />
    </>
  );
}
