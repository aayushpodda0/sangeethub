"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListMusic } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDismiss } from "@/lib/hooks/use-dismiss";

type PlaylistOption = { id: string; name: string; isMine: boolean };

async function fetchMine(): Promise<PlaylistOption[]> {
  const res = await fetch("/api/playlists");
  if (!res.ok) throw new Error("Couldn't load playlists");
  const body = (await res.json()) as { data: { playlists: PlaylistOption[] } };
  return body.data.playlists.filter((p) => p.isMine);
}

export function AddToPlaylistMenu({ trackId }: { trackId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, close, open);

  const { data: playlists, isLoading, isError } = useQuery({
    queryKey: ["playlists", "mine"],
    queryFn: fetchMine,
    enabled: open,
  });

  async function addTo(playlist: PlaylistOption) {
    setAddingTo(playlist.id);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (res.status === 409) {
        toast.info(`Already in ${playlist.name}`);
      } else if (!res.ok) {
        throw new Error(body.error?.message ?? "Couldn't add the track");
      } else {
        toast.success(`Added to ${playlist.name}`);
        queryClient.invalidateQueries({ queryKey: ["playlist", playlist.id] });
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
        setOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the track");
    } finally {
      setAddingTo(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="outline" size="sm" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)} className="gap-2">
        <ListMusic className="size-4" />
        Add to playlist
      </Button>

      {open && (
        <div role="menu" aria-label="Add to playlist" className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl">
          {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Loading your playlists...</p>}
          {isError && <p className="px-3 py-2 text-sm text-destructive">Couldn&apos;t load your playlists.</p>}
          {playlists && playlists.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              You don&apos;t have a playlist yet.{" "}
              <Link href="/playlists" className="text-accent underline">
                Create one
              </Link>
            </p>
          )}
          {playlists?.map((playlist) => (
            <button
              key={playlist.id}
              role="menuitem"
              type="button"
              disabled={addingTo !== null}
              onClick={() => addTo(playlist)}
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
            >
              {addingTo === playlist.id ? "Adding..." : playlist.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
