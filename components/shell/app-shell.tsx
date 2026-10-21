"use client";

import {
  BarChart3,
  Compass,
  Home,
  Library,
  ListMusic,
  LogOut,
  MoreHorizontal,
  Radio,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";

import { useDismiss } from "@/lib/hooks/use-dismiss";
import {
  isNavActive,
  PRIMARY_NAV,
  profileHref,
  shouldShowShell,
  type NavItem,
} from "@/lib/navigation";
import { usePlayerStore } from "@/lib/player/store";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/home": Home,
  "/search": Search,
  "/discover": Compass,
  "/library": Library,
  "/playlists": ListMusic,
  "/party": Radio,
  "/insights": BarChart3,
};

const MOBILE_MAIN = PRIMARY_NAV.filter((item) =>
  ["/home", "/search", "/discover", "/library"].includes(item.href),
);
const MOBILE_MORE = PRIMARY_NAV.filter((item) => !MOBILE_MAIN.includes(item));

/** Height of the mobile tab bar. Exposed as a CSS variable so the fixed player bar can sit above it. */
const MOBILE_NAV_HEIGHT = "3.5rem";
/** Roughly the height of the fixed player bar - the sidebar stops above it while something is playing. */
const PLAYER_BAR_HEIGHT = "7.25rem";

function Brand() {
  return (
    <Link
      href="/home"
      className="flex items-center gap-2.5 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span
        aria-hidden
        className="size-8 rounded-full bg-[image:var(--gradient-sunset)] shadow-[0_6px_20px_-6px_rgba(242,84,45,0.6)]"
      />
      <span className="font-display text-xl font-medium tracking-tight">SangeetHub</span>
    </Link>
  );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = ICONS[item.href]!;
  const active = isNavActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "bg-accent/10 text-accent"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
      {item.label}
    </Link>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
        active ? "text-accent" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  );
}

function MoreMenu({ pathname, username }: { pathname: string; username: string | undefined }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, close, open);

  const profile = username ? profileHref(username) : null;
  const active =
    MOBILE_MORE.some((item) => isNavActive(item, pathname)) ||
    (profile ? pathname === profile : false);

  return (
    <div ref={ref} className="relative flex flex-1">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
          active ? "text-accent" : "text-muted-foreground",
        )}
      >
        <MoreHorizontal className="size-5" aria-hidden />
        More
      </button>

      {open && (
        <div
          role="menu"
          aria-label="More"
          className="absolute bottom-full right-2 mb-2 w-48 rounded-2xl border border-border bg-card p-2 shadow-xl"
        >
          {MOBILE_MORE.map((item) => {
            const Icon = ICONS[item.href]!;
            return (
              <Link
                key={item.href}
                role="menuitem"
                href={item.href}
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          {profile && (
            <Link
              role="menuitem"
              href={profile}
              onClick={close}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
            >
              <User className="size-4" aria-hidden />
              Profile
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Global navigation. Desktop: fixed left sidebar. Mobile: bottom tab bar (+ "More" menu).
 * Only renders for signed-in users on app pages; marketing/auth pages and signed-out visitors
 * get the bare page, exactly as before.
 */
export function AppShell({ children }: PropsWithChildren) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const hasTrack = usePlayerStore((state) => state.currentTrack() !== null);
  const show = shouldShowShell(pathname, Boolean(session?.user));

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bottom-nav-h", show ? MOBILE_NAV_HEIGHT : "0px");
    return () => {
      root.style.removeProperty("--bottom-nav-h");
    };
  }, [show]);

  if (!show || !session?.user) {
    return <>{children}</>;
  }

  const username = session.user.username ?? undefined;
  const displayName = session.user.name ?? username ?? "You";

  return (
    <>
      <aside
        aria-label="Sidebar"
        className="fixed left-0 top-0 z-30 hidden w-60 flex-col border-r border-border bg-background px-3 pb-4 pt-6 md:flex"
        style={{ bottom: hasTrack ? PLAYER_BAR_HEIGHT : 0 }}
      >
        <Brand />
        <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="mt-auto border-t border-border pt-4">
          <Link
            href={username ? profileHref(username) : "/home"}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-sunset)] text-sm font-semibold text-accent-foreground"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              {username && (
                <span className="block truncate text-xs text-muted-foreground">@{username}</span>
              )}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="pb-14 md:pb-0 md:pl-60">{children}</div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur md:hidden"
        style={{ height: MOBILE_NAV_HEIGHT }}
      >
        {MOBILE_MAIN.map((item) => (
          <MobileTab
            key={item.href}
            href={item.href}
            label={item.label}
            icon={ICONS[item.href]!}
            active={isNavActive(item, pathname)}
          />
        ))}
        <MoreMenu pathname={pathname} username={username} />
      </nav>
    </>
  );
}
