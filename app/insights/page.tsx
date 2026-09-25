import type { Metadata } from "next";

import { InsightsPageContent } from "@/components/insights/insights-page-content";

export const metadata: Metadata = {
  title: "Insights | SangeetHub",
};

export default function InsightsPage() {
  return <InsightsPageContent />;
}
