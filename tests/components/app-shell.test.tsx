import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/home" }));
const auth = vi.hoisted(() => ({
  session: null as null | { user: { name?: string; username?: string } },
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: auth.session,
    status: auth.session ? "authenticated" : "unauthenticated",
  }),
  signOut: auth.signOut,
}));

import { AppShell } from "@/components/shell/app-shell";
import { usePlayerStore } from "@/lib/player/store";
import type { DiscoveryTrack } from "@/types/music";

const signedIn = { user: { name: "Aayush Poddar", username: "aayush" } };
const renderShell = () =>
  render(
    <AppShell>
      <main>page content</main>
    </AppShell>,
  );

beforeEach(() => {
  nav.pathname = "/home";
  auth.session = signedIn;
  auth.signOut.mockReset();
  usePlayerStore.getState().clearQueue();
  document.documentElement.style.removeProperty("--bottom-nav-h");
});

describe("AppShell visibility", () => {
  it("renders navigation around the page for a signed-in user", () => {
    renderShell();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Primary" })).toHaveLength(2); // sidebar + mobile tab bar
  });

  it("renders only the page for signed-out visitors", () => {
    auth.session = null;
    renderShell();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it.each(["/", "/login", "/signup"])("stays out of the way on %s even when signed in", (path) => {
    nav.pathname = path;
    renderShell();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

describe("AppShell navigation", () => {
  it("links every main section in the sidebar", () => {
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    for (const [label, href] of [
      ["Home", "/home"],
      ["Search", "/search"],
      ["Discover", "/discover"],
      ["Library", "/library"],
      ["Playlists", "/playlists"],
      ["Party", "/party"],
      ["Insights", "/insights"],
    ]) {
      expect(within(sidebar).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("marks the current section with aria-current, including nested routes", () => {
    nav.pathname = "/playlists/abc123";
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    expect(within(sidebar).getByRole("link", { name: "Playlists" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(sidebar).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("shows the user card linking to their profile", () => {
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    const card = within(sidebar).getByRole("link", { name: /Aayush Poddar/ });
    expect(card).toHaveAttribute("href", "/profile/aayush");
    expect(card).toHaveTextContent("@aayush");
  });

  it("signs out back to the landing page", async () => {
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    await userEvent.click(within(sidebar).getByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});

describe("AppShell mobile", () => {
  it("exposes secondary destinations through the More menu and closes on Escape", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const menu = screen.getByRole("menu", { name: "More" });
    for (const name of ["Playlists", "Party", "Insights", "Profile"]) {
      expect(within(menu).getByRole("menuitem", { name })).toBeInTheDocument();
    }
    expect(within(menu).getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile/aayush",
    );

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "More" })).not.toBeInTheDocument();
  });

  it("highlights More when you're on one of its pages", () => {
    nav.pathname = "/insights";
    renderShell();
    expect(screen.getByRole("button", { name: "More" }).className).toContain("text-accent");
  });

  it("publishes the tab bar height so the fixed player can sit above it, and clears it when hidden", () => {
    const { unmount } = renderShell();
    expect(document.documentElement.style.getPropertyValue("--bottom-nav-h")).toBe("3.5rem");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--bottom-nav-h")).toBe("");

    auth.session = null;
    renderShell();
    expect(document.documentElement.style.getPropertyValue("--bottom-nav-h")).toBe("0px");
  });
});

describe("AppShell with the player", () => {
  const track = {
    id: "t1",
    title: "T",
    artistNames: ["A"],
    albumTitle: "B",
    previewUrl: "x",
    durationSeconds: 3,
  } as DiscoveryTrack;

  it("ends the sidebar above the player bar only while something is playing", () => {
    renderShell();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    expect(sidebar.style.bottom).toBe("0px");

    act(() => usePlayerStore.getState().playTrack(track, [track]));
    expect(sidebar.style.bottom).toBe("7.25rem");
  });
});
