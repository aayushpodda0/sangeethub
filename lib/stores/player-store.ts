"use client";

import { create } from "zustand";

import type { PlayerTrack } from "@/types/music";

export type RepeatMode = "off" | "one" | "all";

type PlayerState = {
  queue: PlayerTrack[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  setQueue: (tracks: PlayerTrack[], startIndex?: number, autoplay?: boolean) => void;
  playTrack: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  playAt: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: PlayerTrack) => void;
  addToQueueNext: (track: PlayerTrack) => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (from: number, to: number) => void;
  clearQueue: () => void;
  setCurrentTime: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  errorMessage: null,
  currentTime: 0,
  duration: 0,
  volume: 0.75,
  isMuted: false,
  isShuffle: false,
  repeatMode: "off",
  setQueue: (tracks, startIndex = 0, autoplay = true) => {
    if (!tracks.length) {
      set({ queue: [], currentIndex: -1, isPlaying: false, currentTime: 0, duration: 0 });
      return;
    }
    const safeIndex = clamp(startIndex, 0, tracks.length - 1);
    set({
      queue: tracks,
      currentIndex: safeIndex,
      isPlaying: autoplay,
      currentTime: 0,
      duration: tracks[safeIndex].durationSeconds,
      errorMessage: null,
    });
  },
  playTrack: (track, queue) => {
    if (queue?.length) {
      const index = queue.findIndex((entry) => entry.id === track.id);
      const startIndex = index >= 0 ? index : 0;
      get().setQueue(queue, startIndex, true);
      return;
    }

    const existingQueue = get().queue;
    const existingIndex = existingQueue.findIndex((entry) => entry.id === track.id);
    if (existingIndex >= 0) {
      get().playAt(existingIndex);
      return;
    }

    set({
      queue: [...existingQueue, track],
      currentIndex: existingQueue.length,
      isPlaying: true,
      currentTime: 0,
      duration: track.durationSeconds,
      errorMessage: null,
    });
  },
  playAt: (index) => {
    const { queue } = get();
    if (!queue.length || index < 0 || index >= queue.length) {
      return;
    }
    set({
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      duration: queue[index].durationSeconds,
      errorMessage: null,
    });
  },
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  next: () => {
    const { queue, currentIndex, repeatMode, isShuffle } = get();
    if (!queue.length) return;
    if (repeatMode === "one") {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (isShuffle && queue.length > 1) {
      let randomIndex = currentIndex;
      while (randomIndex === currentIndex) {
        randomIndex = Math.floor(Math.random() * queue.length);
      }
      get().playAt(randomIndex);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      get().playAt(nextIndex);
      return;
    }

    if (repeatMode === "all") {
      get().playAt(0);
      return;
    }

    set({ isPlaying: false, currentTime: 0 });
  },
  previous: () => {
    const { currentTime, currentIndex, queue } = get();
    if (!queue.length) return;
    if (currentTime > 5) {
      set({ currentTime: 0 });
      return;
    }

    if (currentIndex > 0) {
      get().playAt(currentIndex - 1);
    } else {
      set({ currentTime: 0, isPlaying: true });
    }
  },
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  addToQueueNext: (track) =>
    set((state) => {
      if (state.currentIndex < 0) {
        return { queue: [track], currentIndex: 0, isPlaying: true };
      }
      const queue = [...state.queue];
      queue.splice(state.currentIndex + 1, 0, track);
      return { queue };
    }),
  removeFromQueue: (index) =>
    set((state) => {
      if (index < 0 || index >= state.queue.length) return state;
      const queue = state.queue.filter((_, i) => i !== index);

      if (!queue.length) {
        return { queue: [], currentIndex: -1, isPlaying: false, currentTime: 0, duration: 0 };
      }

      if (index < state.currentIndex) {
        return { queue, currentIndex: state.currentIndex - 1 };
      }

      if (index === state.currentIndex) {
        const currentIndex = Math.min(state.currentIndex, queue.length - 1);
        return {
          queue,
          currentIndex,
          currentTime: 0,
          duration: queue[currentIndex].durationSeconds,
        };
      }

      return { queue };
    }),
  moveQueueItem: (from, to) =>
    set((state) => {
      if (
        from < 0 ||
        to < 0 ||
        from >= state.queue.length ||
        to >= state.queue.length ||
        from === to
      ) {
        return state;
      }
      const queue = [...state.queue];
      const [item] = queue.splice(from, 1);
      queue.splice(to, 0, item);

      let currentIndex = state.currentIndex;
      if (state.currentIndex === from) {
        currentIndex = to;
      } else if (from < state.currentIndex && to >= state.currentIndex) {
        currentIndex -= 1;
      } else if (from > state.currentIndex && to <= state.currentIndex) {
        currentIndex += 1;
      }

      return { queue, currentIndex };
    }),
  clearQueue: () => set({ queue: [], currentIndex: -1, isPlaying: false, currentTime: 0, duration: 0 }),
  setCurrentTime: (seconds) => set({ currentTime: Math.max(0, seconds) }),
  setDuration: (seconds) => set({ duration: Math.max(0, seconds) }),
  setVolume: (volume) => set({ volume: clamp(volume, 0, 1) }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  cycleRepeatMode: () =>
    set((state) => ({
      repeatMode:
        state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off",
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
}));

export function getCurrentTrack(state: Pick<PlayerState, "queue" | "currentIndex">) {
  if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) {
    return null;
  }
  return state.queue[state.currentIndex];
}

