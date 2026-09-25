"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Disc3, Heart, Search as SearchIcon, User } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LikeTrackButton } from "@/components/library/like-track-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayerStore } from "@/lib/player/store";
import { cn, formatDuration } from "@/lib/utils";
import type { DiscoveryTrack } from "@/types/music";

type LibraryData = {
  likedTracks: { likedAt: string; track: DiscoveryTrack }[];
  savedAlbums: {
    savedAt: string;
    album: { id: string; title: string; artworkUrl: string | null; artistName: string };
  }[];
  followedArtists: { followedAt: string; artist: { id: string; name: string; imageUrl: string | null } }[];
  recentlyPlayed: { playedAt: string; track: DiscoveryTrack }[];
};

async function fetchLibrary(): Promise<LibraryData> {
  const res = await fetch("/api/library");
  const body = (await res.json()) as { data?: LibraryData; error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? "Couldn't load your library.");
  return body.data!;
}

type Tab = "liked" | "albums" | "artists" | "recent";

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: "liked", label: "Liked songs", icon: Heart },
  { id: "albums", label: "Saved albums", icon: Disc3 },
  { id: "artists", label: "Following", icon: User },
  { id: "recent", label: "Recently played", icon: Clock },
];

export function LibraryPageContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("liked");
  const [filter, setFilter] = useState("");

  const playTrack = usePlayerStore((state) => state.playTrack);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["library"],
    queryFn: fetchLibrary,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't clear history.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.success("Listening history cleared");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredLikedTracks = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.likedTracks;
    return data.likedTracks.filter(
      ({ track }) =>
        track.title.toLowerCase().includes(q) ||
        track.artistNames.some((name) => name.toLowerCase().includes(q)),
    );
  }, [data, filter]);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-sm text-destructive">{error?.message ?? "Couldn't load your library."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Your library</h1>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Library sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition",
              tab === id ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "liked" && (
        <section>
          <div className="relative mb-3">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter liked songs..."
              aria-label="Filter liked songs"
              className="pl-9"
            />
          </div>

          {filteredLikedTracks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {data.likedTracks.length === 0 ? "No liked songs yet." : "No matches for that filter."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredLikedTracks.map(({ track }) => (
                <li key={track.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                  <button
                    type="button"
                    aria-label={`Play ${track.title}`}
                    onClick={() => playTrack(track, data.likedTracks.map((t) => t.track))}
                    className="size-10 shrink-0 rounded-lg bg-linear-to-br from-accent to-secondary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{track.artistNames.join(", ")}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                    {formatDuration(track.durationSeconds)}
                  </span>
                  <LikeTrackButton trackId={track.id} initiallyLiked />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "albums" &&
        (data.savedAlbums.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No saved albums yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.savedAlbums.map(({ album }) => (
              <li key={album.id}>
                <Link
                  href={`/albums/${album.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-accent/50"
                >
                  <div className="size-12 shrink-0 rounded-lg bg-linear-to-br from-accent to-secondary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{album.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{album.artistName}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {tab === "artists" &&
        (data.followedArtists.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Not following any artists yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.followedArtists.map(({ artist }) => (
              <li key={artist.id}>
                <Link
                  href={`/artists/${artist.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-accent/50"
                >
                  <div className="size-12 shrink-0 rounded-full bg-linear-to-br from-accent to-secondary" />
                  <p className="truncate text-sm font-medium">{artist.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {tab === "recent" && (
        <section>
          {data.recentlyPlayed.length > 0 && (
            <div className="mb-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
              >
                Clear history
              </Button>
            </div>
          )}
          {data.recentlyPlayed.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No listening history yet.</p>
          ) : (
            <ul className="space-y-1">
              {data.recentlyPlayed.map(({ track, playedAt }, index) => (
                <li
                  key={`${track.id}-${playedAt}-${index}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
                >
                  <button
                    type="button"
                    aria-label={`Play ${track.title}`}
                    onClick={() => playTrack(track, data.recentlyPlayed.map((t) => t.track))}
                    className="size-10 shrink-0 rounded-lg bg-linear-to-br from-accent to-secondary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{track.artistNames.join(", ")}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(playedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
