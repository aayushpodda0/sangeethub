import type { Metadata } from "next";

import { PlaylistDetail } from "@/components/playlists/playlist-detail";
import { getPlaylistAccess } from "@/lib/playlists/authorization";
import { createPrivateMetadata, createShareMetadata } from "@/lib/seo/metadata";

type PlaylistPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PlaylistPageProps): Promise<Metadata> {
  const { id } = await params;
  const access = await getPlaylistAccess(id, undefined);

  if (!access) return { title: "Playlist | SangeetHub", robots: { index: false, follow: false } };
  if (!access.playlist.isPublic) return createPrivateMetadata("Private playlist");

  const trackCount = access.playlist.tracks.length;
  return createShareMetadata({
    title: access.playlist.name,
    description:
      access.playlist.description ??
      `${trackCount} ${trackCount === 1 ? "track" : "tracks"} curated on SangeetHub.`,
    path: `/playlists/${access.playlist.id}`,
    kind: "playlist",
  });
}

export default async function PlaylistDetailPage({ params }: PlaylistPageProps) {
  const { id } = await params;
  return <PlaylistDetail playlistId={id} />;
}
