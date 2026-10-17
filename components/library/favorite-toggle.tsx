"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Heart, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS = {
  like: { off: Heart, on: Heart },
  follow: { off: UserPlus, on: UserCheck },
  save: { off: Bookmark, on: BookmarkCheck },
} as const;

type FavoriteToggleProps = {
  /** e.g. /api/favorites/tracks/<id> - PUT adds, DELETE removes. */
  endpoint: string;
  initial: boolean;
  kind: keyof typeof ICONS;
  /** Accessible subject, e.g. a track title or artist name. */
  subject: string;
  variant?: "icon" | "button";
  labels: { on: string; off: string };
};

export function FavoriteToggle({ endpoint, initial, kind, subject, variant = "button", labels }: FavoriteToggleProps) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState(initial);
  const [pending, setPending] = useState(false);
  const Icon = ICONS[kind][active ? "on" : "off"];

  async function toggle() {
    if (pending) return;
    const next = !active;
    setActive(next); // optimistic
    setPending(true);
    try {
      const res = await fetch(endpoint, { method: next ? "PUT" : "DELETE" });
      if (!res.ok) throw new Error("request failed");
      queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.success(next ? `${labels.on}: ${subject}` : `Removed: ${subject}`);
    } catch {
      setActive(!next); // roll back
      toast.error("Couldn't update that. Please try again.");
    } finally {
      setPending(false);
    }
  }

  // Icon-only toggles need a constant accessible name; the on/off state is exposed via aria-pressed.
  const ariaLabel = `${labels.off} ${subject}`;

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={active}
        onClick={toggle}
        className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Icon className={cn("size-4", active && kind === "like" && "fill-accent text-accent", active && kind !== "like" && "text-accent")} />
      </button>
    );
  }

  return (
    <Button type="button" variant={active ? "secondary" : "outline"} size="sm" aria-pressed={active} onClick={toggle} className="gap-2">
      <Icon className={cn("size-4", active && kind === "like" && "fill-current")} />
      {active ? labels.on : labels.off}
    </Button>
  );
}
