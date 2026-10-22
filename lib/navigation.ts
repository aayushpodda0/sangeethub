export type NavItem = {
  href: string;
  label: string;
  /** exact: only that path. prefix: that path and anything beneath it (/playlists/123). */
  match: "exact" | "prefix";
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", match: "exact" },
  { href: "/search", label: "Search", match: "prefix" },
  { href: "/discover", label: "Discover", match: "prefix" },
  { href: "/library", label: "Library", match: "prefix" },
  { href: "/playlists", label: "Playlists", match: "prefix" },
  { href: "/party", label: "Party", match: "prefix" },
  { href: "/insights", label: "Insights", match: "prefix" },
];

/** Pages that never show the app shell, even when signed in (marketing + auth screens). */
export const SHELL_HIDDEN_ROUTES = ["/", "/login", "/signup", "/onboarding"];

export function isNavActive(item: Pick<NavItem, "href" | "match">, pathname: string): boolean {
  if (pathname === item.href) return true;
  return item.match === "prefix" && pathname.startsWith(`${item.href}/`);
}

export function shouldShowShell(pathname: string, signedIn: boolean): boolean {
  return signedIn && !SHELL_HIDDEN_ROUTES.includes(pathname);
}

export function profileHref(username: string): string {
  return `/profile/${username}`;
}
