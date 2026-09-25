import type { Metadata } from "next";

import { PlaylistsPageContent } from "@/components/playlists/playlists-page-content";

export const metadata: Metadata = {
  title: "Playlists | SangeetHub",
};

export default function PlaylistsPage() {
  return <PlaylistsPageContent />;
}
