import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { Artwork } from "@/components/music/artwork";
import { PlayTrackButton } from "@/components/player/play-track-button";
import { usePlayerStore } from "@/lib/player/store";
import type { DiscoveryTrack } from "@/types/music";

const track = (id: string) =>
  ({
    id,
    title: `Song ${id}`,
    artistNames: ["A"],
    albumTitle: "B",
    previewUrl: "x",
    durationSeconds: 3,
  }) as DiscoveryTrack;

beforeEach(() => usePlayerStore.getState().clearQueue());

describe("PlayTrackButton", () => {
  it("renders the labelled pill by default (primary call to action)", () => {
    render(<PlayTrackButton track={track("a")} label="Play album" />);
    expect(screen.getByRole("button", { name: "Play Song a" })).toHaveTextContent("Play album");
  });

  it("compact mode is icon-only, starts playback, and then offers Pause", async () => {
    const a = track("a");
    render(<PlayTrackButton track={a} queue={[a, track("b")]} compact />);
    const button = screen.getByRole("button", { name: "Play Song a" });
    expect(button).not.toHaveTextContent("Play");

    await userEvent.click(button);
    expect(usePlayerStore.getState().currentTrack()?.id).toBe("a");
    expect(usePlayerStore.getState().queue).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Pause Song a" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Pause Song a" }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe("Artwork", () => {
  it("is announced as an image with alt text by default", () => {
    render(<Artwork src="/artwork/x.svg" seed="s" alt="Tabla Tides cover art" />);
    expect(screen.getByRole("img", { name: "Tabla Tides cover art" })).toBeInTheDocument();
  });

  it("is hidden from assistive tech when decorative", () => {
    const { container } = render(<Artwork src="/artwork/x.svg" seed="s" alt="" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("always includes a generated gradient fallback, and escapes quotes in the image URL", () => {
    const { container } = render(<Artwork src={'/a"b.svg'} seed="s" alt="x" />);
    const style = container.firstElementChild!.getAttribute("style")!;
    expect(style).toContain("linear-gradient");
    expect(style).toContain("%22");
    expect(style).not.toContain('a"b');
  });

  it("uses only the gradient when there's no image", () => {
    const { container } = render(<Artwork seed="s" alt="x" />);
    expect(container.firstElementChild!.getAttribute("style")).not.toContain("url(");
  });

  it("uses a fully round shape when asked", () => {
    const { container } = render(<Artwork seed="s" alt="x" round />);
    expect(container.firstElementChild!.className).toContain("rounded-full");
  });
});
