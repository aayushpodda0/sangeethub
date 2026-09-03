"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PlayTrackButton } from "@/components/player/play-track-button";
import { Input } from "@/components/ui/input";
import type { PlayerTrack } from "@/types/music";

type SearchResultTrack = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "track";
  track: PlayerTrack;
};

type SearchResultItem = SearchResultTrack | {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "artist" | "album" | "playlist";
};

type SearchApiResponse = {
  query: string;
  results: {
    tracks: SearchResultTrack[];
    artists: SearchResultItem[];
    albums: SearchResultItem[];
    playlists: SearchResultItem[];
  };
};

async function fetchSearch(query: string): Promise<SearchApiResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("Search failed.");
  }
  return response.json() as Promise<SearchApiResponse>;
}

type SearchViewProps = {
  initialQuery: string;
};

export function SearchView({ initialQuery }: SearchViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextUrl = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
      router.replace(nextUrl);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchSearch(query),
    enabled: query.trim().length > 0,
  });

  const flattened = useMemo(() => {
    if (!data) return [];
    return [
      ...data.results.tracks,
      ...data.results.artists,
      ...data.results.albums,
      ...data.results.playlists,
    ] as SearchResultItem[];
  }, [data]);
  const activeResultIndex = flattened.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), flattened.length - 1);

  return (
    <section className="space-y-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          placeholder="Search tracks, artists, albums, playlists, genre, language, mood..."
          aria-label="Search music"
          onKeyDown={(event) => {
            if (!flattened.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(flattened.length - 1, index + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
            }
            if (event.key === "Enter" && activeResultIndex >= 0 && activeResultIndex < flattened.length) {
              event.preventDefault();
              router.push(flattened[activeResultIndex].href);
            }
          }}
        />
      </div>

      {!query.trim() ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Start typing to discover tracks by title, artist, language, genre, mood, or activity.
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Search failed. Please retry.
        </div>
      ) : null}

      {query.trim() && !isLoading && data && flattened.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No results found for “{query}”.
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <ResultGroup title="Tracks" items={data.results.tracks} activeIndex={activeResultIndex} offset={0} />
          <ResultGroup
            title="Artists"
            items={data.results.artists}
            activeIndex={activeResultIndex}
            offset={data.results.tracks.length}
          />
          <ResultGroup
            title="Albums"
            items={data.results.albums}
            activeIndex={activeResultIndex}
            offset={data.results.tracks.length + data.results.artists.length}
          />
          <ResultGroup
            title="Playlists"
            items={data.results.playlists}
            activeIndex={activeResultIndex}
            offset={data.results.tracks.length + data.results.artists.length + data.results.albums.length}
          />
        </div>
      ) : null}
    </section>
  );
}

function ResultGroup({
  title,
  items,
  activeIndex,
  offset,
}: {
  title: string;
  items: SearchResultItem[];
  activeIndex: number;
  offset: number;
}) {
  const router = useRouter();

  if (!items.length) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, index) => {
          const isActive = activeIndex === offset + index;
          return (
            <li
              key={`${item.type}-${item.id}`}
              className={`rounded-xl border p-3 ${isActive ? "border-accent bg-accent/10" : "border-border bg-card"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => router.push(item.href)}
                  aria-current={isActive}
                >
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                </button>
                {item.type === "track" ? <PlayTrackButton track={item.track} label="Play" /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
