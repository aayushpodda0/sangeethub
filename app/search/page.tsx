import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchPageContent } from "@/components/search/search-page-content";

export const metadata: Metadata = {
  title: "Search | SangeetHub",
};

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
