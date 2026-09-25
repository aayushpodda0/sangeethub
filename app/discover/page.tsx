import type { Metadata } from "next";

import { DiscoverPageContent } from "@/components/discover/discover-page-content";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Discover | SangeetHub",
};

export default async function DiscoverPage() {
  const [independentArtists, languageCounts] = await Promise.all([
    prisma.artist.findMany({
      where: { isIndependent: true },
      orderBy: { popularity: "desc" },
      take: 8,
      select: { id: true, name: true, city: true, region: true },
    }),
    prisma.track.groupBy({
      by: ["language"],
      _count: { _all: true },
      orderBy: { _count: { language: "desc" } },
    }),
  ]);

  return (
    <DiscoverPageContent
      independentArtists={independentArtists}
      languageCounts={languageCounts.map((l) => ({ language: l.language, count: l._count._all }))}
    />
  );
}
