import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username} | SangeetHub` };
}

function topN<T extends string>(counts: Map<T, number>, n: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

export default async function ProfilePage({ params }: RouteParams) {
  const { username } = await params;
  const session = await getAuthSession();

  const profileUser = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, name: true, username: true, image: true, createdAt: true },
  });

  if (!profileUser) {
    notFound();
  }

  const isOwnProfile = session?.user?.id === profileUser.id;

  const [publicPlaylists, favoriteTracks, recentlyPlayed] = await Promise.all([
    prisma.playlist.findMany({
      where: { ownerId: profileUser.id, isPublic: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: { id: true, name: true, description: true, _count: { select: { tracks: true } } },
    }),
    prisma.favoriteTrack.findMany({
      where: { userId: profileUser.id },
      select: {
        track: {
          select: {
            language: true,
            genres: { select: { genre: { select: { name: true } } } },
          },
        },
      },
    }),
    isOwnProfile
      ? prisma.recentlyPlayed.findMany({
          where: { userId: profileUser.id },
          orderBy: { playedAt: "desc" },
          take: 6,
          select: { track: { select: { id: true, title: true } }, playedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const genreCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  for (const { track } of favoriteTracks) {
    languageCounts.set(track.language, (languageCounts.get(track.language) ?? 0) + 1);
    for (const g of track.genres) {
      genreCounts.set(g.genre.name, (genreCounts.get(g.genre.name) ?? 0) + 1);
    }
  }
  const topGenres = topN(genreCounts, 5);
  const topLanguages = topN(languageCounts, 3);

  const initial = (profileUser.name ?? profileUser.username).charAt(0).toUpperCase();
  const joinedYear = new Date(profileUser.createdAt).getFullYear();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-secondary text-xl font-semibold text-background">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {profileUser.name ?? profileUser.username}
          </h1>
          <p className="text-sm text-muted-foreground">
            @{profileUser.username} • joined {joinedYear}
          </p>
        </div>
      </div>

      {(topGenres.length > 0 || topLanguages.length > 0) && (
        <section className="mb-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Taste
          </h2>
          <div className="flex flex-wrap gap-2">
            {topGenres.map((g) => (
              <span key={g} className="rounded-full border border-border px-3 py-1 text-xs">
                {g}
              </span>
            ))}
            {topLanguages.map((l) => (
              <span key={l} className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">
                {l.charAt(0) + l.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Public playlists
        </h2>
        {publicPlaylists.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public playlists yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {publicPlaylists.map((playlist) => (
              <li key={playlist.id}>
                <Link
                  href={`/playlists/${playlist.id}`}
                  className="block rounded-xl border border-border bg-card p-3 transition hover:border-accent/50"
                >
                  <p className="truncate text-sm font-medium">{playlist.name}</p>
                  <p className="text-xs text-muted-foreground">{playlist._count.tracks} tracks</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwnProfile && recentlyPlayed.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recently played
          </h2>
          <ul className="space-y-1.5 text-sm">
            {recentlyPlayed.map((entry, i) => (
              <li key={`${entry.track.id}-${i}`}>
                <Link href={`/tracks/${entry.track.id}`} className="hover:underline">
                  {entry.track.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
