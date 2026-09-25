"use client";

import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ListMusic, Lock, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PlaylistSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  isCollaborative: boolean;
  trackCount: number;
  owner: { id: string; name: string; username: string };
  isMine: boolean;
};

async function fetchPlaylists(): Promise<PlaylistSummary[]> {
  const res = await fetch("/api/playlists");
  if (!res.ok) throw new Error("Failed to load playlists");
  const body = (await res.json()) as { data: { playlists: PlaylistSummary[] } };
  return body.data.playlists;
}

export function PlaylistsPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const { data: playlists, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: fetchPlaylists,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, isPublic }),
      });
      const body = (await res.json()) as { data?: { id: string }; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't create playlist");
      return body.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist created");
      router.push(`/playlists/${data.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>
        <Button onClick={() => setShowCreateForm((v) => !v)} className="gap-2">
          <Plus className="size-4" />
          New playlist
        </Button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Give your playlist a name first.");
              return;
            }
            createMutation.mutate();
          }}
          className="mb-8 space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            aria-label="Playlist name"
            autoFocus
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            aria-label="Playlist description"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="size-4 rounded border-border accent-accent"
            />
            Make this playlist public
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create playlist"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && playlists && playlists.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No playlists yet. Create your first one to get started.
        </p>
      )}

      {!isLoading && playlists && playlists.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <Link
                href={`/playlists/${playlist.id}`}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition hover:border-accent/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{playlist.name}</p>
                  <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    {!playlist.isPublic && <Lock className="size-3.5" aria-label="Private" />}
                    {playlist.isCollaborative && <Users className="size-3.5" aria-label="Collaborative" />}
                  </div>
                </div>
                {playlist.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{playlist.description}</p>
                )}
                <div className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <ListMusic className="size-3.5" />
                  {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"} • by{" "}
                  {playlist.isMine ? "you" : playlist.owner.name}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
