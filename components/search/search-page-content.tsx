"use client";

import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { TrackRow } from "@/components/search/track-row";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { ProviderTrack } from "@/lib/music/provider";

type SearchResponse = { data: { tracks: ProviderTrack[]; query: string } };

async function fetchSearch(query: string): Promise<ProviderTrack[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error("Search request failed");
  }
  const body = (await res.json()) as SearchResponse;
  return body.data.tracks;
}

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(inputValue, 300);
  const listRef = useRef<HTMLUListElement>(null);

  const {
    data: tracks,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => fetchSearch(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  function handleChange(value: string) {
    setInputValue(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const focusable = listRef.current?.querySelectorAll<HTMLButtonElement>("button[aria-label^='Play']");
    if (!focusable || focusable.length === 0) return;

    const currentIndex = Array.from(focusable).findIndex((el) => el === document.activeElement);
    const direction = e.key === "ArrowDown" ? 1 : -1;
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), focusable.length - 1);
    focusable[nextIndex]?.focus();
  }

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Search</h1>

      <div className="relative mb-6">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search tracks, artists, albums, genres..."
          aria-label="Search music"
          className="pl-9"
          autoFocus
        />
      </div>

      {!hasQuery && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Start typing to search the SangeetHub catalog.
        </p>
      )}

      {hasQuery && isFetching && (
        <ul className="space-y-2" aria-label="Loading results">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </ul>
      )}

      {hasQuery && isError && (
        <p className="py-12 text-center text-sm text-destructive">
          Something went wrong while searching. Please try again.
        </p>
      )}

      {hasQuery && !isFetching && !isError && tracks && tracks.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No results for &ldquo;{debouncedQuery}&rdquo;. Try a different title, artist, or genre.
        </p>
      )}

      {hasQuery && !isFetching && !isError && tracks && tracks.length > 0 && (
        <ul
          ref={listRef}
          onKeyDown={handleListKeyDown}
          className="space-y-1"
          aria-label={`${tracks.length} search results`}
        >
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} tracks={tracks} />
          ))}
        </ul>
      )}
    </main>
  );
}
