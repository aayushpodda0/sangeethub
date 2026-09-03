import type { LanguageCode, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack, toPlayerTrack } from "@/lib/music/serializers";

const trackInclude = {
  album: true,
  artists: {
    include: {
      artist: true,
    },
  },
  genres: {
    include: {
      genre: true,
    },
  },
} satisfies Prisma.TrackInclude;

export async function getTrackById(trackId: string) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: trackInclude,
  });

  if (!track) {
    return null;
  }

  return toDiscoveryTrack(track);
}

export async function getTrendingTracks(limit = 10) {
  const tracks = await prisma.track.findMany({
    include: trackInclude,
    orderBy: [{ popularity: "desc" }, { title: "asc" }],
    take: limit,
  });

  return tracks.map(toDiscoveryTrack);
}

export async function getTracksByLanguage(language: LanguageCode, limit = 20) {
  const tracks = await prisma.track.findMany({
    where: { language },
    include: trackInclude,
    orderBy: [{ popularity: "desc" }, { releaseDate: "desc" }],
    take: limit,
  });

  return tracks.map(toDiscoveryTrack);
}

export async function getTracksByGenreSlug(slug: string, limit = 20) {
  const tracks = await prisma.track.findMany({
    where: {
      genres: {
        some: {
          genre: {
            slug,
          },
        },
      },
    },
    include: trackInclude,
    orderBy: [{ popularity: "desc" }, { title: "asc" }],
    take: limit,
  });

  return tracks.map(toDiscoveryTrack);
}

export async function getQuickQueue(limit = 10) {
  const tracks = await prisma.track.findMany({
    include: trackInclude,
    orderBy: [{ popularity: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return tracks.map(toPlayerTrack);
}

