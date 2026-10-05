import { beforeEach, describe, expect, it } from "vitest";

import { usePlayerStore } from "@/lib/player/store";
import type { ProviderTrack } from "@/lib/music/provider";

function makeTrack(id: string, overrides: Partial<ProviderTrack> = {}): ProviderTrack {
  return {
    id,
    title: `Track ${id}`,
    artistNames: ["Test Artist"],
    albumTitle: "Test Album",
    durationSeconds: 180,
    previewUrl: `https://example.com/${id}.mp3`,
    artworkUrl: null,
    language: "ENGLISH",
    moods: [],
    activities: [],
    tempo: 120,
    popularity: 50,
    ...overrides,
  } as ProviderTrack;
}

describe("usePlayerStore", () => {
  beforeEach(() => {
    usePlayerStore.getState().clearQueue();
    usePlayerStore.setState({ shuffle: false, repeat: "off" });
  });

  it("playTrack sets the queue context and marks it playing", () => {
    const tracks = [makeTrack("a"), makeTrack("b"), makeTrack("c")];
    usePlayerStore.getState().playTrack(tracks[1], tracks);

    const state = usePlayerStore.getState();
    expect(state.currentTrack()?.id).toBe("b");
    expect(state.isPlaying).toBe(true);
    expect(state.queue).toHaveLength(3);
  });

  it("playNext advances to the next track", () => {
    const tracks = [makeTrack("a"), makeTrack("b"), makeTrack("c")];
    usePlayerStore.getState().playQueue(tracks, 0);
    usePlayerStore.getState().playNext();

    expect(usePlayerStore.getState().currentTrack()?.id).toBe("b");
  });

  it("playNext stops at the end when repeat is off", () => {
    const tracks = [makeTrack("a"), makeTrack("b")];
    usePlayerStore.getState().playQueue(tracks, 1);
    usePlayerStore.getState().playNext();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(false);
  });

  it("playNext wraps to the start when repeat is 'all'", () => {
    const tracks = [makeTrack("a"), makeTrack("b")];
    usePlayerStore.getState().playQueue(tracks, 1);
    usePlayerStore.setState({ repeat: "all" });
    usePlayerStore.getState().playNext();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  it("playNext stays on the same track when repeat is 'one'", () => {
    const tracks = [makeTrack("a"), makeTrack("b")];
    usePlayerStore.getState().playQueue(tracks, 0);
    usePlayerStore.setState({ repeat: "one" });
    usePlayerStore.getState().playNext();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it("playPrevious moves back, and clamps at the start", () => {
    const tracks = [makeTrack("a"), makeTrack("b")];
    usePlayerStore.getState().playQueue(tracks, 1);
    usePlayerStore.getState().playPrevious();
    expect(usePlayerStore.getState().currentIndex).toBe(0);

    usePlayerStore.getState().playPrevious();
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it("playNextInQueue inserts right after the currently playing track", () => {
    const tracks = [makeTrack("a"), makeTrack("b"), makeTrack("c")];
    usePlayerStore.getState().playQueue(tracks, 0);
    usePlayerStore.getState().playNextInQueue(makeTrack("x"));

    const queueIds = usePlayerStore.getState().queue.map((t) => t.id);
    expect(queueIds).toEqual(["a", "x", "b", "c"]);
  });

  it("removeFromQueue removes a track and adjusts currentIndex if needed", () => {
    const tracks = [makeTrack("a"), makeTrack("b"), makeTrack("c")];
    usePlayerStore.getState().playQueue(tracks, 2);
    usePlayerStore.getState().removeFromQueue(0);

    const state = usePlayerStore.getState();
    expect(state.queue.map((t) => t.id)).toEqual(["b", "c"]);
    expect(state.currentIndex).toBe(1); // was 2, shifted down by one removed-before-it item
  });

  it("removeFromQueue refuses to remove the currently playing track", () => {
    const tracks = [makeTrack("a"), makeTrack("b")];
    usePlayerStore.getState().playQueue(tracks, 0);
    usePlayerStore.getState().removeFromQueue(0);

    expect(usePlayerStore.getState().queue).toHaveLength(2);
  });

  it("reorderQueue moves a track and keeps currentIndex pointing at the same track", () => {
    const tracks = [makeTrack("a"), makeTrack("b"), makeTrack("c")];
    usePlayerStore.getState().playQueue(tracks, 0); // playing "a"
    usePlayerStore.getState().reorderQueue(0, 2); // move "a" to the end

    const state = usePlayerStore.getState();
    expect(state.queue.map((t) => t.id)).toEqual(["b", "c", "a"]);
    expect(state.currentTrack()?.id).toBe("a");
  });

  it("toggleShuffle keeps the current track playing and restores original order when turned off", () => {
    const tracks = [makeTrack("a"), makeTrack("b"), makeTrack("c"), makeTrack("d")];
    usePlayerStore.getState().playQueue(tracks, 2); // playing "c"

    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().currentTrack()?.id).toBe("c");
    expect(usePlayerStore.getState().shuffle).toBe(true);

    usePlayerStore.getState().toggleShuffle();
    const state = usePlayerStore.getState();
    expect(state.shuffle).toBe(false);
    expect(state.queue.map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
    expect(state.currentTrack()?.id).toBe("c");
  });

  it("cycleRepeat cycles off -> all -> one -> off", () => {
    expect(usePlayerStore.getState().repeat).toBe("off");
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeat).toBe("all");
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeat).toBe("one");
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeat).toBe("off");
  });

  it("setVolume clamps between 0 and 1 and auto-mutes at 0", () => {
    usePlayerStore.getState().setVolume(1.5);
    expect(usePlayerStore.getState().volume).toBe(1);

    usePlayerStore.getState().setVolume(0);
    expect(usePlayerStore.getState().isMuted).toBe(true);
  });

  it("clearQueue resets playback entirely", () => {
    const tracks = [makeTrack("a")];
    usePlayerStore.getState().playQueue(tracks, 0);
    usePlayerStore.getState().clearQueue();

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(0);
    expect(state.currentIndex).toBe(-1);
    expect(state.isPlaying).toBe(false);
    expect(state.currentTrack()).toBeNull();
  });
});
