import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";

const trackInclude = {
  album: true,
  artists: { include: { artist: true } },
  genres: { include: { genre: true } },
} as const;

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    const [likedTracks, savedAlbums, followedArtists, recentlyPlayed] = await Promise.all([
      prisma.favoriteTrack.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { track: { include: trackInclude } },
      }),
      prisma.savedAlbum.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { album: { include: { primaryArtist: true } } },
      }),
      prisma.followedArtist.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { artist: true },
      }),
      prisma.recentlyPlayed.findMany({
        where: { userId },
        orderBy: { playedAt: "desc" },
        take: 50,
        include: { track: { include: trackInclude } },
      }),
    ]);

    return apiSuccess({
      likedTracks: likedTracks.map((f) => ({ likedAt: f.createdAt, track: toDiscoveryTrack(f.track) })),
      savedAlbums: savedAlbums.map((s) => ({
        savedAt: s.createdAt,
        album: {
          id: s.album.id,
          title: s.album.title,
          artworkUrl: s.album.artworkUrl,
          artistName: s.album.primaryArtist.name,
        },
      })),
      followedArtists: followedArtists.map((f) => ({
        followedAt: f.createdAt,
        artist: { id: f.artist.id, name: f.artist.name, imageUrl: f.artist.imageUrl },
      })),
      recentlyPlayed: recentlyPlayed.map((r) => ({
        playedAt: r.playedAt,
        track: toDiscoveryTrack(r.track),
      })),
    });
  } catch (error) {
    console.error("[library] failed:", error);
    return apiError(500, "LIBRARY_LOAD_FAILED", "Couldn't load your library. Please try again.");
  }
}
