"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FolderPlus, ListMusic, Lock, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  folder: { id: string; name: string } | null;
};

type Folder = { id: string; name: string; playlistCount: number };

async function fetchPlaylists(): Promise<PlaylistSummary[]> {
  const res = await fetch("/api/playlists");
  if (!res.ok) throw new Error("Failed to load playlists");
  const body = (await res.json()) as { data: { playlists: PlaylistSummary[] } };
  return body.data.playlists;
}

async function fetchFolders(): Promise<Folder[]> {
  const res = await fetch("/api/playlist-folders");
  if (!res.ok) throw new Error("Failed to load folders");
  const body = (await res.json()) as { data: { folders: Folder[] } };
  return body.data.folders;
}

function PlaylistCard({
  playlist,
  folders,
  onMoved,
}: {
  playlist: PlaylistSummary;
  folders: Folder[];
  onMoved: () => void;
}) {
  const moveMutation = useMutation({
    mutationFn: async (folderId: string | null) => {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't move playlist");
    },
    onSuccess: onMoved,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition hover:border-accent/50">
      <Link href={`/playlists/${playlist.id}`} className="flex flex-col gap-2">
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
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ListMusic className="size-3.5" />
          {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"} • by{" "}
          {playlist.isMine ? "you" : playlist.owner.name}
        </div>
      </Link>

      {playlist.isMine && folders.length > 0 && (
        <select
          value={playlist.folder?.id ?? ""}
          onChange={(e) => moveMutation.mutate(e.target.value || null)}
          disabled={moveMutation.isPending}
          aria-label={`Move ${playlist.name} to a folder`}
          className="rounded-lg border border-border bg-input px-2 py-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function FolderSection({
  folder,
  playlists,
  allFolders,
  onChanged,
}: {
  folder: Folder | null;
  playlists: PlaylistSummary[];
  allFolders: Folder[];
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder?.name ?? "");

  const renameMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playlist-folders/${folder!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't rename folder");
    },
    onSuccess: () => {
      setRenaming(false);
      onChanged();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playlist-folders/${folder!.id}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't delete folder");
    },
    onSuccess: onChanged,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        {renaming ? (
          <>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              aria-label="Folder name"
              className="h-8 max-w-48"
              autoFocus
            />
            <button
              type="button"
              onClick={() => renameMutation.mutate()}
              disabled={renameMutation.isPending}
              aria-label="Save folder name"
              className="rounded p-1 text-accent hover:bg-accent/10"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRenaming(false);
                setRenameValue(folder!.name);
              }}
              aria-label="Cancel rename"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {folder ? folder.name : "Unsorted"}
            </h2>
            <span className="text-xs text-muted-foreground">({playlists.length})</span>
            {folder && (
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  aria-label={`Rename ${folder.name}`}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete the "${folder.name}" folder? Playlists inside won't be deleted.`)) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete ${folder.name}`}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {playlists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <PlaylistCard playlist={playlist} folders={allFolders} onMoved={onChanged} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PlaylistsPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState("");

  const { data: playlists, isLoading } = useQuery({ queryKey: ["playlists"], queryFn: fetchPlaylists });
  const { data: folders } = useQuery({ queryKey: ["playlist-folders"], queryFn: fetchFolders });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["playlists"] });
    queryClient.invalidateQueries({ queryKey: ["playlist-folders"] });
  };

  const createPlaylistMutation = useMutation({
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
      invalidateAll();
      toast.success("Playlist created");
      router.push(`/playlists/${data.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/playlist-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Couldn't create folder");
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Folder created");
      setFolderName("");
      setShowFolderForm(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const myFolders = folders ?? [];
  const grouped = new Map<string | null, PlaylistSummary[]>();
  for (const playlist of playlists ?? []) {
    const key = playlist.folder?.id ?? null;
    grouped.set(key, [...(grouped.get(key) ?? []), playlist]);
  }
  const unsorted = grouped.get(null) ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFolderForm((v) => !v)} className="gap-2">
            <FolderPlus className="size-4" />
            New folder
          </Button>
          <Button onClick={() => setShowCreateForm((v) => !v)} className="gap-2">
            <Plus className="size-4" />
            New playlist
          </Button>
        </div>
      </div>

      {showFolderForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!folderName.trim()) {
              toast.error("Give your folder a name first.");
              return;
            }
            createFolderMutation.mutate();
          }}
          className="mb-6 flex gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            aria-label="Folder name"
            autoFocus
          />
          <Button type="submit" disabled={createFolderMutation.isPending}>
            Create
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowFolderForm(false)}>
            Cancel
          </Button>
        </form>
      )}

      {showCreateForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Give your playlist a name first.");
              return;
            }
            createPlaylistMutation.mutate();
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
            <Button type="submit" disabled={createPlaylistMutation.isPending}>
              {createPlaylistMutation.isPending ? "Creating..." : "Create playlist"}
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

      {!isLoading && playlists && playlists.length === 0 && myFolders.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No playlists yet. Create your first one to get started.
        </p>
      )}

      {!isLoading &&
        myFolders.map((folder) => (
          <FolderSection
            key={folder.id}
            folder={folder}
            playlists={grouped.get(folder.id) ?? []}
            allFolders={myFolders}
            onChanged={invalidateAll}
          />
        ))}

      {!isLoading && (unsorted.length > 0 || myFolders.length === 0) && (
        <FolderSection
          folder={null}
          playlists={unsorted}
          allFolders={myFolders}
          onChanged={invalidateAll}
        />
      )}
    </main>
  );
}
