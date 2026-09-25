"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { PlayTrackButton } from "@/components/player/play-track-button";
import { cn, formatDuration } from "@/lib/utils";
import type { DiscoveryTrack } from "@/types/music";

const MOODS = ["FOCUS", "WORKOUT", "RELAX", "TRAVEL", "PARTY", "SLEEP", "HAPPY", "SAD", "ENERGETIC", "CALM"] as const;
const ACTIVITIES = [
  "STUDY",
  "GYM",
  "COMMUTE",
  "CODING",
  "YOGA",
  "RUNNING",
  "MEDITATION",
  "CELEBRATION",
  "SLEEPING",
] as const;
const LANGUAGES = [
  "HINDI",
  "MARATHI",
  "TAMIL",
  "TELUGU",
  "BENGALI",
  "MALAYALAM",
  "KANNADA",
  "PUNJABI",
  "ENGLISH",
] as const;

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

async function fetchDiscover(params: { mood?: string; activity?: string; language?: string }) {
  const search = new URLSearchParams();
  if (params.mood) search.set("mood", params.mood);
  if (params.activity) search.set("activity", params.activity);
  if (params.language) search.set("language", params.language);

  const res = await fetch(`/api/discover?${search.toString()}`);
  if (!res.ok) throw new Error("Couldn't load discovery results.");
  const body = (await res.json()) as { data: { tracks: DiscoveryTrack[] } };
  return body.data.tracks;
}

type Props = {
  independentArtists: { id: string; name: string; city: string | null; region: string | null }[];
  languageCounts: { language: string; count: number }[];
};

export function DiscoverPageContent({ independentArtists, languageCounts }: Props) {
  const [mood, setMood] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  const hasFilter = Boolean(mood || activity || language);

  const { data: tracks, isFetching } = useQuery({
    queryKey: ["discover", mood, activity, language],
    queryFn: () =>
      fetchDiscover({ mood: mood ?? undefined, activity: activity ?? undefined, language: language ?? undefined }),
    enabled: hasFilter,
  });

  function ChipRow({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: readonly string[];
    value: string | null;
    onChange: (v: string | null) => void;
  }) {
    return (
      <div className="mb-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => onChange(value === option ? null : option)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-sm transition",
                value === option ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {titleCase(option)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Discover</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Not real-time charts — rankings are based on the current catalog&apos;s popularity data.
      </p>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <ChipRow label="Mood" options={MOODS} value={mood} onChange={setMood} />
          <ChipRow label="Activity" options={ACTIVITIES} value={activity} onChange={setActivity} />
          <ChipRow label="Language" options={LANGUAGES} value={language} onChange={setLanguage} />

          {!hasFilter && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Pick a mood, activity, or language to explore the catalog.
            </p>
          )}

          {hasFilter && isFetching && (
            <ul className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </ul>
          )}

          {hasFilter && !isFetching && tracks && tracks.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No tracks match that combination yet.
            </p>
          )}

          {hasFilter && !isFetching && tracks && tracks.length > 0 && (
            <ul className="space-y-1">
              {tracks.map((track) => (
                <li key={track.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                  <div className="size-10 shrink-0 rounded-lg bg-gradient-to-br from-accent to-secondary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {track.artistNames.join(", ")} • {track.language}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                    {formatDuration(track.durationSeconds)}
                  </span>
                  <PlayTrackButton track={track} queue={tracks} label="Play" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Regional charts
            </h2>
            <ul className="mt-3 space-y-2">
              {languageCounts.map((entry) => (
                <li key={entry.language}>
                  <button
                    type="button"
                    onClick={() => setLanguage(entry.language)}
                    className="flex w-full items-center justify-between text-sm hover:underline"
                  >
                    <span>{titleCase(entry.language)}</span>
                    <span className="text-xs text-muted-foreground">{entry.count} tracks</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Featured independent artists
            </h2>
            <ul className="mt-3 space-y-2">
              {independentArtists.map((artist) => (
                <li key={artist.id}>
                  <Link href={`/artists/${artist.id}`} className="text-sm font-medium hover:underline">
                    {artist.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[artist.city, artist.region].filter(Boolean).join(", ") || "India"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
