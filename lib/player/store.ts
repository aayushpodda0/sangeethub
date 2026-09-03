import { create } from "zustand";

import type { ProviderTrack } from "@/lib/music/provider";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: ProviderTrack[];
  originalQueue: ProviderTrack[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;

  currentTrack: () => ProviderTrack | null;

  playTrack: (track: ProviderTrack, queueContext?: ProviderTrack[]) => void;
  playQueue: (tracks: ProviderTrack[], startIndex?: number) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: ProviderTrack) => void;
  playNextInQueue: (track: ProviderTrack) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setError: (message: string | null) => void;
};

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  shuffle: false,
  repeat: "off",
  error: null,

  currentTrack: () => {
    const { queue, currentIndex } = get();
    return currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  },

  playTrack: (track, queueContext) => {
    const context = queueContext ?? [track];
    const index = context.findIndex((t) => t.id === track.id);
    set({
      originalQueue: context,
      queue: get().shuffle ? shuffleArray(context) : context,
      currentIndex: index >= 0 ? index : 0,
      isPlaying: true,
      error: null,
    });
  },

  playQueue: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return;
    set({
      originalQueue: tracks,
      queue: get().shuffle ? shuffleArray(tracks) : tracks,
      currentIndex: startIndex,
      isPlaying: true,
      error: null,
    });
  },

  togglePlay: () => {
    if (get().currentTrack() === null) return;
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    if (get().currentTrack() === null) return;
    set({ isPlaying: true });
  },

  playNext: () => {
    const { queue, currentIndex, repeat } = get();
    if (queue.length === 0) return;

    if (repeat === "one") {
      set({ isPlaying: true });
      return;
    }

    const isLast = currentIndex >= queue.length - 1;
    if (isLast) {
      if (repeat === "all") {
        set({ currentIndex: 0, isPlaying: true });
      } else {
        set({ isPlaying: false });
      }
      return;
    }

    set({ currentIndex: currentIndex + 1, isPlaying: true });
  },

  playPrevious: () => {
    const { currentIndex } = get();
    if (currentIndex <= 0) {
      set({ isPlaying: true });
      return;
    }
    set({ currentIndex: currentIndex - 1, isPlaying: true });
  },

  addToQueue: (track) => {
    set((state) => ({
      queue: [...state.queue, track],
      originalQueue: [...state.originalQueue, track],
    }));
  },

  playNextInQueue: (track) => {
    set((state) => {
      const insertAt = state.currentIndex + 1;
      const queue = [...state.queue];
      queue.splice(insertAt, 0, track);
      return { queue, originalQueue: [...state.originalQueue, track] };
    });
  },

  removeFromQueue: (index) => {
    set((state) => {
      if (index === state.currentIndex) return state;
      const queue = state.queue.filter((_, i) => i !== index);
      const currentIndex = index < state.currentIndex ? state.currentIndex - 1 : state.currentIndex;
      return { queue, currentIndex };
    });
  },

  reorderQueue: (fromIndex, toIndex) => {
    set((state) => {
      const queue = [...state.queue];
      const [moved] = queue.splice(fromIndex, 1);
      queue.splice(toIndex, 0, moved);

      let currentIndex = state.currentIndex;
      if (fromIndex === state.currentIndex) {
        currentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        currentIndex -= 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        currentIndex += 1;
      }

      return { queue, currentIndex };
    });
  },

  clearQueue: () => set({ queue: [], originalQueue: [], currentIndex: -1, isPlaying: false }),

  toggleShuffle: () => {
    set((state) => {
      const shuffle = !state.shuffle;
      const current = state.queue[state.currentIndex] ?? null;

      if (shuffle) {
        const rest = state.originalQueue.filter((t) => t.id !== current?.id);
        const shuffled = current ? [current, ...shuffleArray(rest)] : shuffleArray(rest);
        return { shuffle, queue: shuffled, currentIndex: current ? 0 : -1 };
      }

      const restoredIndex = current
        ? state.originalQueue.findIndex((t) => t.id === current.id)
        : -1;
      return { shuffle, queue: state.originalQueue, currentIndex: restoredIndex };
    });
  },

  cycleRepeat: () => {
    set((state) => {
      const order: RepeatMode[] = ["off", "all", "one"];
      const next = order[(order.indexOf(state.repeat) + 1) % order.length];
      return { repeat: next };
    });
  },

  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)), isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setError: (message) => set({ error: message, isPlaying: message ? false : get().isPlaying }),
}));
