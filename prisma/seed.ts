import { PrismaClient, Activity, LanguageCode, Mood, Role } from "@prisma/client";
import { hash } from "bcryptjs";

import { ALBUMS, ALL_TRACKS, ARTISTS, GENRES, PLAYLISTS, PREVIEW_CLIPS } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  const DEV_ADMIN_PASSWORD = "Admin@12345";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" && adminPassword === DEV_ADMIN_PASSWORD) {
    throw new Error(
      "Refusing to seed a production database with the well-known demo admin password. Set SEED_ADMIN_PASSWORD.",
    );
  }
  const adminPasswordHash = await hash(adminPassword, 12);

  const [adminUser, demoUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@sangeethub.local" },
      update: {},
      create: {
        email: "admin@sangeethub.local",
        username: "sangeet_admin",
        name: "SangeetHub Admin",
        role: Role.ADMIN,
        passwordHash: adminPasswordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "listener@sangeethub.local" },
      update: {},
      create: {
        email: "listener@sangeethub.local",
        username: "demo_listener",
        name: "Demo Listener",
        role: Role.USER,
        passwordHash: await hash("Listener@12345", 12),
      },
    }),
  ]);

  // ---- Catalog (seed-owned: rerunning updates these rows in place) ----
  await Promise.all(
    GENRES.map((g) => prisma.genre.upsert({ where: { slug: g.slug }, update: { name: g.name }, create: { ...g } })),
  );

  const artistIds = new Map<string, string>();
  for (const a of ARTISTS) {
    const data = {
      name: a.name,
      bio: a.bio,
      city: a.city,
      region: a.region,
      imageUrl: a.imageUrl,
      isIndependent: a.isIndependent,
      popularity: a.popularity,
    };
    const row = await prisma.artist.upsert({ where: { slug: a.slug }, update: data, create: { slug: a.slug, ...data } });
    artistIds.set(a.slug, row.id);
  }

  const genreIds = new Map((await prisma.genre.findMany()).map((g) => [g.slug, g.id]));
  const trackIds = new Map<string, string>();
  const albumIds = new Map<string, string>();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const a of ALBUMS) {
    const releaseDate = new Date(Date.now() - a.releasedDaysAgo * DAY_MS);
    const albumData = {
      title: a.title,
      description: a.description,
      releaseDate,
      artworkUrl: a.artworkUrl,
      language: a.language as LanguageCode,
      popularity: a.popularity,
      primaryArtistId: artistIds.get(a.artist)!,
    };
    const albumRow = await prisma.album.upsert({
      where: { slug: a.slug },
      update: albumData,
      create: { slug: a.slug, ...albumData },
    });
    albumIds.set(a.slug, albumRow.id);

    for (const [i, t] of a.tracks.entries()) {
      const clip = PREVIEW_CLIPS[i % PREVIEW_CLIPS.length];
      const trackData = {
        title: t.title,
        albumId: albumRow.id,
        durationSeconds: clip.seconds, // matches the real audio length
        previewUrl: clip.url,
        language: t.language as LanguageCode,
        moods: t.moods as Mood[],
        activities: t.activities as Activity[],
        tempo: t.tempo,
        popularity: t.popularity,
        releaseDate,
        artworkUrl: a.artworkUrl,
      };
      const trackRow = await prisma.track.upsert({
        where: { slug: t.slug },
        update: trackData,
        create: { slug: t.slug, ...trackData },
      });
      trackIds.set(t.slug, trackRow.id);

      const genreId = genreIds.get(t.genre)!;
      await prisma.trackGenre.upsert({
        where: { trackId_genreId: { trackId: trackRow.id, genreId } },
        update: {},
        create: { trackId: trackRow.id, genreId },
      });

      for (const artistSlug of [t.artist, ...t.featuring]) {
        const artistId = artistIds.get(artistSlug)!;
        await prisma.trackArtist.upsert({
          where: { trackId_artistId: { trackId: trackRow.id, artistId } },
          update: {},
          create: { trackId: trackRow.id, artistId },
        });
      }
    }
  }

  // ---- Demo playlists (owned by the demo listener) ----
  // Only APPENDS missing tracks - never overwrites tracks someone added themselves.
  for (const p of PLAYLISTS) {
    const playlist = await prisma.playlist.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, coverUrl: p.coverUrl },
      create: {
        ownerId: demoUser.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        isPublic: true,
        isCollaborative: p.isCollaborative,
        coverUrl: p.coverUrl,
      },
    });

    const picks = ALL_TRACKS.filter(
      (t) => t.moods.some((m) => p.matchMoods.includes(m)) || t.activities.some((x) => p.matchActivities.includes(x)),
    )
      .sort((x, y) => y.popularity - x.popularity)
      .slice(0, p.limit);

    const existing = await prisma.playlistTrack.findMany({
      where: { playlistId: playlist.id },
      select: { trackId: true, position: true },
    });
    const have = new Set(existing.map((e) => e.trackId));
    let nextPosition = existing.reduce((max, e) => Math.max(max, e.position), 0) + 1;

    for (const pick of picks) {
      const trackId = trackIds.get(pick.slug)!;
      if (have.has(trackId)) continue;
      await prisma.playlistTrack.create({
        data: { playlistId: playlist.id, trackId, addedById: demoUser.id, position: nextPosition++ },
      });
    }
  }

  // ---- Demo listener activity (so recommendations/insights/library are populated on first login) ----
  // Guarded: only runs once, and only for the demo account.
  const hasHistory = (await prisma.recentlyPlayed.count({ where: { userId: demoUser.id } })) > 0;
  if (!hasHistory) {
    for (const slug of ["monsoon-metro", "dilli-ki-shaam", "chalte-raho", "metro-moonlight", "debug-the-dark", "kaapi-kadhai"]) {
      const trackId = trackIds.get(slug)!;
      await prisma.favoriteTrack.upsert({
        where: { userId_trackId: { userId: demoUser.id, trackId } },
        update: {},
        create: { userId: demoUser.id, trackId },
      });
    }
    for (const slug of ["kabir-dhun", "saanjh-collective", "neon-chai"]) {
      const artistId = artistIds.get(slug)!;
      await prisma.followedArtist.upsert({
        where: { userId_artistId: { userId: demoUser.id, artistId } },
        update: {},
        create: { userId: demoUser.id, artistId },
      });
    }
    for (const slug of ["tabla-tides", "golden-hour-drive"]) {
      const albumId = albumIds.get(slug)!;
      await prisma.savedAlbum.upsert({
        where: { userId_albumId: { userId: demoUser.id, albumId } },
        update: {},
        create: { userId: demoUser.id, albumId },
      });
    }

    // Tiny deterministic PRNG so the demo history is the same on every machine.
    let state = 20260101;
    const rand = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const pool = ALL_TRACKS.filter(
      (t) => ["HINDI", "ENGLISH", "TAMIL"].includes(t.language) && t.moods.some((m) => ["FOCUS", "RELAX", "TRAVEL", "HAPPY"].includes(m)),
    );
    const trackToAlbum = new Map(ALL_TRACKS.map((t) => [t.slug, t.albumSlug]));
    const daysWithPlays = [0, 1, 2, 3, 4, 6, 7, 8, 10, 11]; // gap at day 5 -> a realistic 5-day streak
    for (const dayOffset of daysWithPlays) {
      const plays = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < plays; i += 1) {
        const pick = pool[Math.floor(rand() * pool.length)];
        const playedAt = new Date(Date.now() - dayOffset * DAY_MS);
        playedAt.setHours(18 + Math.floor(rand() * 5), Math.floor(rand() * 60), 0, 0);
        if (playedAt.getTime() > Date.now()) playedAt.setTime(Date.now() - 60_000 * (i + 1));
        await prisma.recentlyPlayed.create({
          data: {
            userId: demoUser.id,
            trackId: trackIds.get(pick.slug)!,
            albumId: albumIds.get(trackToAlbum.get(pick.slug)!)!,
            artistId: artistIds.get(pick.artist)!,
            playedAt,
          },
        });
      }
    }
  }

  console.log("Seed complete");
  console.log(
    adminPassword === DEV_ADMIN_PASSWORD
      ? `Admin login: ${adminUser.email} / ${DEV_ADMIN_PASSWORD} (dev only)`
      : `Admin login: ${adminUser.email} (password from SEED_ADMIN_PASSWORD)`,
  );
  console.log(`Demo login: ${demoUser.email} / Listener@12345`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

