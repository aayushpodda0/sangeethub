import type { Metadata } from "next";

import { LibraryPageContent } from "@/components/library/library-page-content";

export const metadata: Metadata = {
  title: "Your Library | SangeetHub",
};

export default function LibraryPage() {
  return <LibraryPageContent />;
}
