import { prisma } from "@/lib/db/prisma";

/** Which of `trackIds` has this user liked? Anonymous users / empty input skip the query entirely. */
export async function getLikedTrackIds(userId: string | undefined, trackIds: string[]): Promise<Set<string>> {
  if (!userId || trackIds.length === 0) return new Set();
  const rows = await prisma.favoriteTrack.findMany({
    where: { userId, trackId: { in: trackIds } },
    select: { trackId: true },
  });
  return new Set(rows.map((r) => r.trackId));
}

export async function isFollowingArtist(userId: string | undefined, artistId: string): Promise<boolean> {
  if (!userId) return false;
  const row = await prisma.followedArtist.findUnique({ where: { userId_artistId: { userId, artistId } } });
  return row !== null;
}

export async function isAlbumSaved(userId: string | undefined, albumId: string): Promise<boolean> {
  if (!userId) return false;
  const row = await prisma.savedAlbum.findUnique({ where: { userId_albumId: { userId, albumId } } });
  return row !== null;
}
