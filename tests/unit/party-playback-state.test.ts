import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computePlaybackState } from "@/lib/party/playback-state";

describe("computePlaybackState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports paused state as-is when startedAt is null", () => {
    const state = computePlaybackState({
      currentTrackId: "track-1",
      startedAt: null,
      playbackPosition: 42,
    });

    expect(state.isPlaying).toBe(false);
    expect(state.positionSeconds).toBe(42);
    expect(state.currentTrackId).toBe("track-1");
  });

  it("extrapolates elapsed time while playing", () => {
    const now = new Date("2026-01-01T00:00:10.000Z");
    vi.setSystemTime(now);

    const state = computePlaybackState({
      currentTrackId: "track-1",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      playbackPosition: 30,
    });

    expect(state.isPlaying).toBe(true);
    expect(state.positionSeconds).toBe(40); // 30s base + 10s elapsed
  });

  it("reports no current track when currentTrackId is null", () => {
    const state = computePlaybackState({
      currentTrackId: null,
      startedAt: null,
      playbackPosition: 0,
    });
    expect(state.currentTrackId).toBeNull();
  });
});
