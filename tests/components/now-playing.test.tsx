import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NowPlaying } from "@/components/player/now-playing";
import { usePlayerStore } from "@/lib/player/store";
import type { DiscoveryTrack } from "@/types/music";

vi.mock("@/components/player/player-engine-context", () => ({
  usePlayerEngine: () => ({ progress: 2, duration: 12, isLoading: false, seek: vi.fn() }),
}));

const track: DiscoveryTrack = {
  id: "track-1",
  title: "Monsoon Metro",
  artistNames: ["Neon Chai"],
  albumTitle: "Night Routes",
  artworkUrl: null,
  previewUrl: "/audio/track.mp3",
  durationSeconds: 12,
  language: "HINDI",
  moods: [],
  activities: [],
  popularity: 50,
  genreNames: [],
};

function wrap(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  usePlayerStore.getState().clearQueue();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { likedTracks: [] } }) }));
});

describe("NowPlaying", () => {
  it("renders shared player details, actions, and queue preview", async () => {
    usePlayerStore.getState().playQueue([track, { ...track, id: "track-2", title: "Dawn Signals" }]);
    wrap(<NowPlaying open onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Monsoon Metro" })).toBeInTheDocument();
    expect(screen.getByText("Dawn Signals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close now playing" })).toHaveLength(2);
    expect(await screen.findByRole("button", { name: "Like" })).toBeInTheDocument();
  });

  it("closes through the accessible close control", async () => {
    const onClose = vi.fn();
    usePlayerStore.getState().playTrack(track);
    wrap(<NowPlaying open onClose={onClose} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Close now playing" })[0]!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
