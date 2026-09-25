"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export function LikeTrackButton({ trackId, initiallyLiked }: { trackId: string; initiallyLiked: boolean }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (nextLiked: boolean) => {
      const res = await fetch(`/api/favorites/tracks/${trackId}`, {
        method: nextLiked ? "PUT" : "DELETE",
      });
      if (!res.ok) throw new Error("Couldn't update this track's liked status.");
      return nextLiked;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const liked = mutation.isPending ? mutation.variables : initiallyLiked;

  return (
    <button
      type="button"
      aria-label={liked ? "Unlike track" : "Like track"}
      aria-pressed={liked}
      onClick={() => mutation.mutate(!liked)}
      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-accent"
    >
      <Heart className={cn("size-4", liked && "fill-accent text-accent")} />
    </button>
  );
}
