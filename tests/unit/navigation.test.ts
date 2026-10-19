import { describe, expect, it } from "vitest";

import {
  isNavActive,
  PRIMARY_NAV,
  profileHref,
  shouldShowShell,
  SHELL_HIDDEN_ROUTES,
} from "@/lib/navigation";

describe("PRIMARY_NAV", () => {
  it("links every major feature exactly once", () => {
    const hrefs = PRIMARY_NAV.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const required of [
      "/home",
      "/search",
      "/discover",
      "/library",
      "/playlists",
      "/party",
      "/insights",
    ]) {
      expect(hrefs).toContain(required);
    }
    hrefs.forEach((h) => expect(h.startsWith("/")).toBe(true));
  });
});

describe("isNavActive", () => {
  const playlists = { href: "/playlists", match: "prefix" as const };
  const home = { href: "/home", match: "exact" as const };

  it("matches the exact path and nested paths for prefix items", () => {
    expect(isNavActive(playlists, "/playlists")).toBe(true);
    expect(isNavActive(playlists, "/playlists/abc123")).toBe(true);
    expect(isNavActive(playlists, "/playlists/join/token")).toBe(true);
  });
  it("does not match lookalike prefixes", () => {
    expect(isNavActive(playlists, "/playlists-archive")).toBe(false);
    expect(isNavActive(playlists, "/library")).toBe(false);
  });
  it("exact items only match themselves", () => {
    expect(isNavActive(home, "/home")).toBe(true);
    expect(isNavActive(home, "/home/anything")).toBe(false);
  });
});

describe("shouldShowShell", () => {
  it("requires a signed-in user", () => {
    expect(shouldShowShell("/home", false)).toBe(false);
    expect(shouldShowShell("/home", true)).toBe(true);
  });
  it("is hidden on marketing and auth pages even when signed in", () => {
    for (const route of SHELL_HIDDEN_ROUTES) expect(shouldShowShell(route, true)).toBe(false);
  });
  it("shows on public content pages for signed-in users", () => {
    expect(shouldShowShell("/tracks/abc", true)).toBe(true);
    expect(shouldShowShell("/artists/abc", true)).toBe(true);
  });
});

describe("profileHref", () => {
  it("builds the profile path", () => {
    expect(profileHref("aayush")).toBe("/profile/aayush");
  });
});
