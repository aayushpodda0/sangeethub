import type { Metadata } from "next";

import { DiscoverPageContent } from "@/components/discover/discover-page-content";
import { musicService } from "@/lib/music/service";

export const metadata: Metadata = {
  title: "Discover | SangeetHub",
};

export default async function DiscoverPage() {
  const [independentArtists, languageCounts] = await Promise.all([
    musicService.getIndependentArtists(8),
    musicService.getLanguageCounts(),
  ]);

  return (
    <DiscoverPageContent
      independentArtists={independentArtists}
      languageCounts={languageCounts}
    />
  );
}
