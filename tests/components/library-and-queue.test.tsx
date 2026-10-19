import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { FavoriteToggle } from "@/components/library/favorite-toggle";
import { QueueButton } from "@/components/music/queue-button";
import { QueuePanel } from "@/components/player/queue-panel";
import { AddToPlaylistMenu } from "@/components/playlists/add-to-playlist-menu";
import { usePlayerStore } from "@/lib/player/store";
import type { DiscoveryTrack } from "@/types/music";

const track = (id: string): DiscoveryTrack =>
  ({
    id,
    title: `Song ${id}`,
    artistNames: ["Artist"],
    albumTitle: "Album",
    artworkUrl: null,
    previewUrl: `https://example.com/${id}.mp3`,
    durationSeconds: 3,
    language: "HINDI",
    moods: [],
    activities: [],
    popularity: 50,
    genreNames: [],
  }) as DiscoveryTrack;

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  usePlayerStore.getState().clearQueue();
});

describe("FavoriteToggle", () => {
  const props = {
    endpoint: "/api/favorites/tracks/t1",
    kind: "like" as const,
    subject: "Monsoon Metro",
    variant: "icon" as const,
    labels: { on: "Liked", off: "Like" },
  };

  it("likes optimistically with PUT and keeps the new state after the server confirms", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    wrap(<FavoriteToggle {...props} initial={false} />);
    const button = screen.getByRole("button", { name: "Like Monsoon Metro" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);

    expect(fetchMock).toHaveBeenCalledWith("/api/favorites/tracks/t1", { method: "PUT" });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("uses DELETE to un-like when already liked", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    wrap(<FavoriteToggle {...props} initial />);
    await userEvent.click(screen.getByRole("button", { name: "Like Monsoon Metro" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/favorites/tracks/t1", { method: "DELETE" });
  });

  it("rolls back and shows an error when the server rejects it", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    wrap(<FavoriteToggle {...props} initial={false} />);
    const button = screen.getByRole("button", { name: "Like Monsoon Metro" });

    await userEvent.click(button);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("rolls back on a network failure too", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    wrap(<FavoriteToggle {...props} initial={false} />);
    const button = screen.getByRole("button", { name: "Like Monsoon Metro" });
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
    expect(toast.error).toHaveBeenCalled();
  });

  it("ignores a second click while the first request is still in flight", async () => {
    let finish!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    wrap(<FavoriteToggle {...props} initial={false} />);
    const button = screen.getByRole("button", { name: "Like Monsoon Metro" });

    await userEvent.click(button);
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish({ ok: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("button variant shows the visible state text", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    wrap(
      <FavoriteToggle
        endpoint="/api/favorites/artists/a1"
        kind="follow"
        subject="Neon Chai"
        labels={{ on: "Following", off: "Follow" }}
        initial={false}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(await screen.findByRole("button", { name: "Following" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("QueueButton", () => {
  it("starts playing the track when nothing is playing (there's no visible queue yet)", async () => {
    render(<QueueButton track={track("a")} />);
    await userEvent.click(screen.getByRole("button", { name: "Add Song a to queue" }));

    expect(usePlayerStore.getState().currentTrack()?.id).toBe("a");
    expect(toast.success).toHaveBeenCalledWith("Playing Song a");
  });

  it("appends to the queue without interrupting the current track", async () => {
    usePlayerStore.getState().playTrack(track("current"), [track("current")]);
    render(<QueueButton track={track("next")} />);
    await userEvent.click(screen.getByRole("button", { name: "Add Song next to queue" }));

    const state = usePlayerStore.getState();
    expect(state.currentTrack()?.id).toBe("current");
    expect(state.queue.map((t) => t.id)).toEqual(["current", "next"]);
    expect(toast.success).toHaveBeenCalledWith("Added to queue: Song next");
  });
});

describe("QueuePanel dismissal", () => {
  beforeEach(() => {
    usePlayerStore.getState().playQueue([track("a"), track("b")], 0);
  });

  it("opens, stays open on inside clicks, and closes on an outside click", async () => {
    render(
      <div>
        <button>outside</button>
        <QueuePanel />
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Toggle queue" }));
    const panel = screen.getByRole("region", { name: "Playback queue" });
    expect(panel).toBeInTheDocument();

    await userEvent.click(panel);
    expect(screen.getByRole("region", { name: "Playback queue" })).toBeInTheDocument();

    await userEvent.click(screen.getByText("outside"));
    expect(screen.queryByRole("region", { name: "Playback queue" })).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<QueuePanel />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle queue" }));
    expect(screen.getByRole("region", { name: "Playback queue" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Playback queue" })).not.toBeInTheDocument();
  });
});

describe("AddToPlaylistMenu", () => {
  const playlists = [
    { id: "p1", name: "My Mix", isMine: true },
    { id: "p2", name: "Someone Else's", isMine: false },
  ];
  const open = async () =>
    userEvent.click(screen.getByRole("button", { name: /add to playlist/i }));

  it("only offers playlists the user owns", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { playlists } }) });
    wrap(<AddToPlaylistMenu trackId="t1" />);
    await open();
    expect(await screen.findByRole("menuitem", { name: "My Mix" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Someone Else's" })).not.toBeInTheDocument();
  });

  it("adds the track, confirms, and closes the menu", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST"
        ? { ok: true, status: 201, json: async () => ({}) }
        : { ok: true, json: async () => ({ data: { playlists } }) },
    );
    wrap(<AddToPlaylistMenu trackId="t1" />);
    await open();
    await userEvent.click(await screen.findByRole("menuitem", { name: "My Mix" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Added to My Mix"));
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(post[0]).toBe("/api/playlists/p1/tracks");
    expect(JSON.parse(post[1].body)).toEqual({ trackId: "t1" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("tells the user when the track is already in the playlist (409), without an error toast", async () => {
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === "POST"
        ? { ok: false, status: 409, json: async () => ({ error: { message: "dup" } }) }
        : { ok: true, json: async () => ({ data: { playlists } }) },
    );
    wrap(<AddToPlaylistMenu trackId="t1" />);
    await open();
    await userEvent.click(await screen.findByRole("menuitem", { name: "My Mix" }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Already in My Mix"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows an empty state with a way to create a playlist", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { playlists: [] } }) });
    wrap(<AddToPlaylistMenu trackId="t1" />);
    await open();
    expect(await screen.findByText(/don't have a playlist yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create one/i })).toHaveAttribute("href", "/playlists");
  });

  it("surfaces a load failure", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    wrap(<AddToPlaylistMenu trackId="t1" />);
    await open();
    expect(await screen.findByText(/couldn't load your playlists/i)).toBeInTheDocument();
  });
});
