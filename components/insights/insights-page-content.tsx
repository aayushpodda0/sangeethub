"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Flame, Music2 } from "lucide-react";

import { formatDuration } from "@/lib/utils";

type InsightsData = {
  totalListeningSeconds: number;
  totalPlays: number;
  currentStreakDays: number;
  topArtists: { id: string; name: string; plays: number }[];
  topGenres: { slug: string; name: string; plays: number }[];
  topLanguages: { language: string; plays: number }[];
  topTracks: { id: string; title: string; plays: number }[];
  playsByDay: { date: string; plays: number }[];
  monthlySummary: { plays: number; listeningSeconds: number };
};

async function fetchInsights(): Promise<InsightsData> {
  const res = await fetch("/api/insights");
  const body = (await res.json()) as { data?: InsightsData; error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? "Couldn't load insights.");
  return body.data!;
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.value}</span>
          </div>
          <div
            role="img"
            aria-label={`${item.label}: ${item.value} plays`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="mb-2 size-5 text-accent" aria-hidden />
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const dayLabelFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function InsightsPageContent() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
  });

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
        <p className="text-sm text-destructive">{error?.message ?? "Couldn't load insights."}</p>
      </main>
    );
  }

  if (data.totalPlays === 0) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Your listening insights</h1>
        <p className="py-12 text-center text-sm text-muted-foreground">
          Play a few tracks and your insights will show up here.
        </p>
      </main>
    );
  }

  const maxDayPlays = Math.max(...data.playsByDay.map((d) => d.plays), 1);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Your listening insights</h1>
      <p className="mb-6 text-sm text-muted-foreground">Only visible to you.</p>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Clock} label="Total listening time" value={formatDuration(data.totalListeningSeconds)} />
        <StatCard icon={Music2} label="Total plays" value={String(data.totalPlays)} />
        <StatCard
          icon={Flame}
          label="Current streak"
          value={`${data.currentStreakDays} day${data.currentStreakDays === 1 ? "" : "s"}`}
        />
      </div>

      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          This week
        </h2>
        <div className="flex items-end gap-2" role="img" aria-label="Plays over the last 7 days">
          {data.playsByDay.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-accent"
                  style={{ height: `${Math.max((day.plays / maxDayPlays) * 100, day.plays > 0 ? 8 : 2)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {dayLabelFormatter.format(new Date(day.date))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          This month
        </h2>
        <p className="text-sm">
          {data.monthlySummary.plays} plays • {formatDuration(data.monthlySummary.listeningSeconds)} listened
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top artists
          </h2>
          <BarList items={data.topArtists.map((a) => ({ label: a.name, value: a.plays }))} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top genres
          </h2>
          <BarList items={data.topGenres.map((g) => ({ label: g.name, value: g.plays }))} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top languages
          </h2>
          <BarList items={data.topLanguages.map((l) => ({ label: l.language, value: l.plays }))} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top tracks
          </h2>
          <BarList items={data.topTracks.map((t) => ({ label: t.title, value: t.plays }))} />
        </section>
      </div>
    </main>
  );
}
