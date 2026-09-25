"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { DiscoveryTrack } from "@/types/music";

async function fetchSearch(query: string): Promise<DiscoveryTrack[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { data: { tracks: DiscoveryTrack[] } };
  return body.data.tracks;
}

export function AddTrackSearch({ playlistId }: { playlistId: string }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const hasQuery = debouncedQuery.trim().length > 0;

  const { data: results, isFetching } = useQuery({
    queryKey: ["add-track-search", debouncedQuery],
    queryFn: () => fetchSearch(debouncedQuery),
    enabled: hasQuery,
  });

  const addMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't add track");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      toast.success("Track added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks to add..."
          aria-label="Search tracks to add to this playlist"
          className="pl-9"
        />
      </div>

      {hasQuery && (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-2">
          {isFetching && <li className="px-2 py-3 text-sm text-muted-foreground">Searching...</li>}
          {!isFetching && results && results.length === 0 && (
            <li className="px-2 py-3 text-sm text-muted-foreground">No matches.</li>
          )}
          {!isFetching &&
            results?.map((track) => (
              <li
                key={track.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artistNames.join(", ")}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Add ${track.title} to playlist`}
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate(track.id)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-accent disabled:opacity-50"
                >
                  <Plus className="size-4" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
