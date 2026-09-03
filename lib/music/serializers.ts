import type { Prisma } from "@prisma/client";

import type { DiscoveryTrack, PlayerTrack } from "@/types/music";

type TrackWithRelations = Prisma.TrackGetPayload<{
  include: {
    album: true;
    artists: {
      include: {
        artist: true;
      };
    };
    genres: {
      include: {
        genre: true;
      };
    };
  };
}>;

export function toPlayerTrack(track: TrackWithRelations): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artistNames: track.artists.map((entry) => entry.artist.name),
    albumTitle: track.album.title,
    artworkUrl: track.artworkUrl ?? track.album.artworkUrl ?? null,
    previewUrl: track.previewUrl,
    durationSeconds: track.durationSeconds,
    language: track.language,
    moods: track.moods,
    activities: track.activities,
  };
}

export function toDiscoveryTrack(track: TrackWithRelations): DiscoveryTrack {
  const base = toPlayerTrack(track);
  return {
    ...base,
    popularity: track.popularity,
    genreNames: track.genres.map((entry) => entry.genre.name),
  };
}

