"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ShareButton({ label = "Share" }: { label?: string }) {
  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled the native share sheet, or it failed - fall through to clipboard copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link. Please copy it from the address bar.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare} className="gap-2">
      <Share2 className="size-4" />
      {label}
    </Button>
  );
}
