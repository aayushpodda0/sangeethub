import { PrismaClient, Activity, LanguageCode, Mood, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const demoTracks = [
  {
    title: "City Lights Raag",
    slug: "city-lights-raag",
    durationSeconds: 184,
    previewUrl: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
    language: LanguageCode.HINDI,
    moods: [Mood.RELAX, Mood.CALM],
    activities: [Activity.STUDY, Activity.MEDITATION],
    tempo: 92,
    popularity: 74,
    genreSlug: "indie-fusion",
  },
  {
    title: "Morning Filter Coffee",
    slug: "morning-filter-coffee",
    durationSeconds: 201,
    previewUrl: "https://samplelib.com/lib/preview/mp3/sample-6s.mp3",
    language: LanguageCode.TAMIL,
    moods: [Mood.HAPPY, Mood.FOCUS],
    activities: [Activity.CODING, Activity.COMMUTE],
    tempo: 106,
    popularity: 66,
    genreSlug: "acoustic-pop",
  },
  {
    title: "Monsoon Metro",
    slug: "monsoon-metro",
    durationSeconds: 168,
    previewUrl: "https://samplelib.com/lib/preview/mp3/sample-9s.mp3",
    language: LanguageCode.ENGLISH,
    moods: [Mood.TRAVEL, Mood.ENERGETIC],
    activities: [Activity.COMMUTE, Activity.RUNNING],
    tempo: 120,
    popularity: 81,
    genreSlug: "electro-pop",
  },
];

async function main() {
  const adminPasswordHash = await hash("Admin@12345", 12);

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

  const genreData = [
    { name: "Indie Fusion", slug: "indie-fusion" },
    { name: "Acoustic Pop", slug: "acoustic-pop" },
    { name: "Electro Pop", slug: "electro-pop" },
  ];

  await Promise.all(
    genreData.map((genre) =>
      prisma.genre.upsert({
        where: { slug: genre.slug },
        update: genre,
        create: genre,
      }),
    ),
  );

  const artists = await Promise.all([
    prisma.artist.upsert({
      where: { slug: "nadiya-wave" },
      update: {},
      create: {
        slug: "nadiya-wave",
        name: "Nadiya Wave",
        bio: "Independent ambient artist blending Indian classical and modern textures.",
        city: "Pune",
        region: "Maharashtra",
        imageUrl: "/artwork/artist-nadiya.svg",
        popularity: 72,
      },
    }),
    prisma.artist.upsert({
      where: { slug: "arivu-axis" },
      update: {},
      create: {
        slug: "arivu-axis",
        name: "Arivu Axis",
        bio: "Fictional multilingual songwriter from Chennai.",
        city: "Chennai",
        region: "Tamil Nadu",
        imageUrl: "/artwork/artist-arivu.svg",
        popularity: 69,
      },
    }),
  ]);

  const album = await prisma.album.upsert({
    where: { slug: "sunset-sessions-vol-1" },
    update: {},
    create: {
      title: "Sunset Sessions Vol. 1",
      slug: "sunset-sessions-vol-1",
      description: "Fictional demo album for SangeetHub development and testing.",
      releaseDate: new Date("2026-01-12"),
      artworkUrl: "/artwork/sunset-sessions.svg",
      language: LanguageCode.HINDI,
      popularity: 75,
      primaryArtistId: artists[0].id,
    },
  });

  for (const [index, track] of demoTracks.entries()) {
    const genre = await prisma.genre.findUniqueOrThrow({ where: { slug: track.genreSlug } });
    const createdTrack = await prisma.track.upsert({
      where: { slug: track.slug },
      update: {},
      create: {
        title: track.title,
        slug: track.slug,
        albumId: album.id,
        durationSeconds: track.durationSeconds,
        previewUrl: track.previewUrl,
        language: track.language,
        moods: track.moods,
        activities: track.activities,
        tempo: track.tempo,
        popularity: track.popularity,
        releaseDate: new Date("2026-01-12"),
        artworkUrl: "/artwork/sunset-sessions.svg",
      },
    });

    await prisma.trackGenre.upsert({
      where: {
        trackId_genreId: {
          trackId: createdTrack.id,
          genreId: genre.id,
        },
      },
      update: {},
      create: {
        trackId: createdTrack.id,
        genreId: genre.id,
      },
    });

    await prisma.trackArtist.upsert({
      where: {
        trackId_artistId: {
          trackId: createdTrack.id,
          artistId: artists[index % artists.length].id,
        },
      },
      update: {},
      create: {
        trackId: createdTrack.id,
        artistId: artists[index % artists.length].id,
      },
    });
  }

  const playlist = await prisma.playlist.upsert({
    where: { slug: "focus-routes" },
    update: {},
    create: {
      ownerId: demoUser.id,
      name: "Focus Routes",
      slug: "focus-routes",
      description: "A demo playlist focused on calm productivity sessions.",
      isPublic: true,
      isCollaborative: true,
      coverUrl: "/artwork/playlist-focus.svg",
    },
  });

  const tracks = await prisma.track.findMany({ orderBy: { title: "asc" } });

  for (const [position, track] of tracks.entries()) {
    await prisma.playlistTrack.upsert({
      where: {
        playlistId_position: {
          playlistId: playlist.id,
          position: position + 1,
        },
      },
      update: {
        trackId: track.id,
      },
      create: {
        playlistId: playlist.id,
        trackId: track.id,
        addedById: demoUser.id,
        position: position + 1,
      },
    });
  }

  await prisma.recommendation.createMany({
    data: tracks.map((track, i) => ({
      userId: demoUser.id,
      trackId: track.id,
      reasonCode: "FREQUENT_GENRE",
      reasonLabel: "Because you listen to indie fusion",
      explanation: i % 2 === 0 ? "Similar genre to your focus playlist." : "Matches your selected mood.",
      score: 0.7 - i * 0.1,
    })),
    skipDuplicates: true,
  });

  console.log("Seed complete");
  console.log(`Admin login: ${adminUser.email} / Admin@12345`);
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

