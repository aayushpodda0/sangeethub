"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

import { useAudioEngine } from "@/lib/player/use-audio-engine";

type PlayerEngine = ReturnType<typeof useAudioEngine>;

const PlayerEngineContext = createContext<PlayerEngine | null>(null);

export function PlayerEngineProvider({ children }: PropsWithChildren) {
  const engine = useAudioEngine();
  return <PlayerEngineContext.Provider value={engine}>{children}</PlayerEngineContext.Provider>;
}

export function usePlayerEngine() {
  const engine = useContext(PlayerEngineContext);
  if (!engine) {
    throw new Error("usePlayerEngine must be used inside PlayerEngineProvider");
  }
  return engine;
}
