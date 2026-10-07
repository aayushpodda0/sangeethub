"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Lock, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AddTrackSearch } from "@/components/playlists/add-track-search";
import { PlaylistTrackRow } from "@/components/playlists/playlist-track-row";
import { ShareButton } from "@/components/shared/share-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SerializedPlaylist } from "@/lib/playlists/serializers";
import { cn } from "@/lib/utils";

async function fetchPlaylist(id: string): Promise<SerializedPlaylist> {
  const res = await fetch(`/api/playlists/${id}`);
  const body = (await res.json()) as { data?: SerializedPlaylist; error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? "Couldn't load playlist");
  return body.data!;
}

type Folder = { id: string; name: string; playlistCount: number };

async function fetchFolders(): Promise<Folder[]> {
  const res = await fetch("/api/playlist-folders");
  if (!res.ok) return [];
  const body = (await res.json()) as { data: { folders: Folder[] } };
  return body.data.folders;
}

export function PlaylistDetail({ playlistId }: { playlistId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: playlist, isLoading, isError, error } = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () => fetchPlaylist(playlistId),
  });

  const { data: folders } = useQuery({
    queryKey: ["playlist-folders"],
    queryFn: fetchFolders,
    enabled: playlist?.canEditSettings === true,
  });

  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [lastSyncedPlaylistId, setLastSyncedPlaylistId] = useState<string | null>(null);

  if (playlist && playlist.id !== lastSyncedPlaylistId) {
    setLastSyncedPlaylistId(playlist.id);
    setNameDraft(playlist.name);
    setDescriptionDraft(playlist.description ?? "");
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });

  const updateMutation = useMutation({
    mutationFn: async (
      patch: Partial<{
        name: string;
        description: string | null;
        isPublic: boolean;
        isCollaborative: boolean;
        folderId: string | null;
      }>,
    ) => {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't update playlist");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Playlist updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeTrackMutation = useMutation({
    mutationFn: async (playlistTrackId: string) => {
      const res = await fetch(`/api/playlists/${playlistId}/tracks/${playlistTrackId}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't remove track");
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedPlaylistTrackIds: string[]) => {
      const res = await fetch(`/api/playlists/${playlistId}/tracks/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedPlaylistTrackIds }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't reorder tracks");
    },
    onSuccess: invalidate,
    onError: (err: Error) => {
      toast.error(err.message);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't delete playlist");
    },
    onSuccess: () => {
      toast.success("Playlist deleted");
      router.push("/playlists");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playlists/${playlistId}/invite`, { method: "POST" });
      const body = (await res.json()) as { data?: { token: string }; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't create invite link");
      return body.data!;
    },
    onSuccess: async (data) => {
      const url = `${window.location.origin}/playlists/join/${data.token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Invite link copied to clipboard");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCollaboratorMutation = useMutation({
    mutationFn: async ({
      userId,
      permission,
    }: {
      userId: string;
      permission: "CONTRIBUTOR" | "MODERATOR";
    }) => {
      const res = await fetch(`/api/playlists/${playlistId}/collaborators/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission, canRemoveOthers: permission === "MODERATOR" }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't update this collaborator");
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/playlists/${playlistId}/collaborators/${userId}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't remove this collaborator");
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !playlist) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-sm text-destructive">{error?.message ?? "Playlist not found."}</p>
      </main>
    );
  }

  const allTracks = playlist.tracks.map((t) => t.track);

  function handleDrop(dropIndex: number) {
    if (dragIndex === null || dragIndex === dropIndex || !playlist) {
      setDragIndex(null);
      return;
    }
    const ids = playlist.tracks.map((t) => t.playlistTrackId);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(dropIndex, 0, moved);
    setDragIndex(null);
    reorderMutation.mutate(ids);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{playlist.name}</h1>
          {playlist.description && <p className="mt-1 text-sm text-muted-foreground">{playlist.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              by{" "}
              {playlist.isOwner ? (
                "you"
              ) : (
                <Link href={`/profile/${playlist.owner.username}`} className="hover:underline">
                  {playlist.owner.name}
                </Link>
              )}{" "}
              • {playlist.tracks.length} tracks
            </span>
            {!playlist.isPublic && (
              <span className="flex items-center gap-1">
                <Lock className="size-3" /> Private
              </span>
            )}
            {playlist.isCollaborative && (
              <span className="flex items-center gap-1">
                <Users className="size-3" /> Collaborative
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareButton label="Share playlist" />
          {playlist.canEditSettings && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
              {showSettings ? "Close settings" : "Settings"}
            </Button>
          )}
        </div>
      </div>

      {showSettings && playlist.canEditSettings && (
        <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} aria-label="Playlist name" />
            <Textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              aria-label="Playlist description"
              placeholder="Description"
            />
            <Button
              size="sm"
              onClick={() => updateMutation.mutate({ name: nameDraft, description: descriptionDraft || null })}
              disabled={updateMutation.isPending}
            >
              Save changes
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={playlist.isPublic}
                onChange={(e) => updateMutation.mutate({ isPublic: e.target.checked })}
                className="size-4 rounded border-border accent-accent"
              />
              Public
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={playlist.isCollaborative}
                onChange={(e) => updateMutation.mutate({ isCollaborative: e.target.checked })}
                className="size-4 rounded border-border accent-accent"
              />
              Allow collaborators to add tracks
            </label>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4 text-sm">
            <label htmlFor="playlist-folder-select" className="shrink-0 text-muted-foreground">
              Folder
            </label>
            <select
              id="playlist-folder-select"
              value={playlist.folder?.id ?? ""}
              onChange={(e) => updateMutation.mutate({ folderId: e.target.value || null })}
              className="rounded-lg border border-border bg-input px-2 py-1 text-sm"
            >
              <option value="">No folder</option>
              {folders?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
            >
              <Link2 className="size-4" />
              Copy invite link
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm(`Delete "${playlist.name}"? This can't be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-4" />
              Delete playlist
            </Button>
          </div>
        </div>
      )}

      {playlist.canAddTrack && (
        <div className="mb-6">
          <AddTrackSearch playlistId={playlistId} />
        </div>
      )}

      {playlist.tracks.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No tracks yet. {playlist.canAddTrack ? "Search above to add some." : ""}
        </p>
      ) : (
        <ul className="space-y-1">
          {playlist.tracks.map((entry, index) => (
            <PlaylistTrackRow
              key={entry.playlistTrackId}
              entry={entry}
              index={index}
              allTracks={allTracks}
              canReorder={playlist.canReorder}
              onRemove={(id) => removeTrackMutation.mutate(id)}
              onDragStart={setDragIndex}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            />
          ))}
        </ul>
      )}

      {playlist.collaborators.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Collaborators</h2>
          <ul className="flex flex-wrap gap-2">
            {playlist.collaborators.map((c) => (
              <li
                key={c.userId}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-xs",
                  c.permission === "MODERATOR" && "border-accent/40",
                )}
              >
                <Link
                  href={`/profile/${c.username}`}
                  className={cn("hover:underline", c.permission === "MODERATOR" && "text-accent")}
                >
                  {c.name ?? c.username}
                </Link>

                {playlist.isOwner ? (
                  <>
                    <select
                      value={c.permission}
                      onChange={(e) =>
                        updateCollaboratorMutation.mutate({
                          userId: c.userId,
                          permission: e.target.value as "CONTRIBUTOR" | "MODERATOR",
                        })
                      }
                      disabled={updateCollaboratorMutation.isPending}
                      aria-label={`Change ${c.name ?? c.username}'s permission`}
                      className="rounded-full border-none bg-transparent text-xs text-muted-foreground"
                    >
                      <option value="CONTRIBUTOR">Contributor</option>
                      <option value="MODERATOR">Moderator</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${c.name ?? c.username} as a collaborator`}
                      onClick={() => {
                        if (confirm(`Remove ${c.name ?? c.username} as a collaborator?`)) {
                          removeCollaboratorMutation.mutate(c.userId);
                        }
                      }}
                      disabled={removeCollaboratorMutation.isPending}
                      className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </>
                ) : (
                  <span className="text-muted-foreground">{c.permission.toLowerCase()}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {playlist.activities.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Activity</h2>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {playlist.activities.map((activity) => (
              <li key={activity.id}>
                <Link href={`/profile/${activity.actor.username}`} className="text-foreground hover:underline">
                  {activity.actor.name ?? activity.actor.username}
                </Link>{" "}
                {activity.message.toLowerCase()}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
