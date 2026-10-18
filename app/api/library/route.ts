import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { musicService } from "@/lib/music/service";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    const [likedRows, savedRows, followedRows, recentRows] = await Promise.all([
      prisma.favoriteTrack.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { trackId: true, createdAt: true },
      }),
      prisma.savedAlbum.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { albumId: true, createdAt: true },
      }),
      prisma.followedArtist.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { artistId: true, createdAt: true },
      }),
      prisma.recentlyPlayed.findMany({
        where: { userId },
        orderBy: { playedAt: "desc" },
        take: 50,
        select: { trackId: true, playedAt: true },
      }),
    ]);

    const [likedTracks, savedAlbums, followedArtists, recentTracks] = await Promise.all([
      musicService.getTracksByIds(likedRows.map((row) => row.trackId)),
      musicService.getAlbumsByIds(savedRows.map((row) => row.albumId)),
      musicService.getArtistsByIds(followedRows.map((row) => row.artistId)),
      musicService.getTracksByIds(recentRows.map((row) => row.trackId)),
    ]);
    const trackById = new Map([...likedTracks, ...recentTracks].map((track) => [track.id, track]));
    const albumById = new Map(savedAlbums.map((album) => [album.id, album]));
    const artistById = new Map(followedArtists.map((artist) => [artist.id, artist]));

    return apiSuccess({
      likedTracks: likedRows.flatMap((row) => {
        const track = trackById.get(row.trackId);
        return track ? [{ likedAt: row.createdAt, track }] : [];
      }),
      savedAlbums: savedRows.flatMap((row) => {
        const album = albumById.get(row.albumId);
        return album
          ? [
              {
                savedAt: row.createdAt,
                album: {
                  id: album.id,
                  title: album.title,
                  artworkUrl: album.artworkUrl,
                  artistName: album.primaryArtist.name,
                },
              },
            ]
          : [];
      }),
      followedArtists: followedRows.flatMap((row) => {
        const artist = artistById.get(row.artistId);
        return artist
          ? [
              {
                followedAt: row.createdAt,
                artist: { id: artist.id, name: artist.name, imageUrl: artist.imageUrl },
              },
            ]
          : [];
      }),
      recentlyPlayed: recentRows.flatMap((row) => {
        const track = trackById.get(row.trackId);
        return track ? [{ playedAt: row.playedAt, track }] : [];
      }),
    });
  } catch (error) {
    console.error("[library] failed:", error);
    return apiError(500, "LIBRARY_LOAD_FAILED", "Couldn't load your library.");
  }
}
