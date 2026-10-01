"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type InvitePreview = {
  playlistId: string;
  playlistName: string;
  invitedByName: string;
  alreadyMember: boolean;
};

async function fetchPreview(token: string): Promise<InvitePreview> {
  const res = await fetch(`/api/playlists/join/${token}`);
  const body = (await res.json()) as { data?: InvitePreview; error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? "Couldn't load this invite.");
  return body.data!;
}

export default function JoinPlaylistPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { data: preview, isLoading, isError, error } = useQuery({
    queryKey: ["playlist-invite", params.token],
    queryFn: () => fetchPreview(params.token),
  });

  async function handleAccept() {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/playlists/join/${params.token}`, { method: "POST" });
      const body = (await res.json()) as { data?: { playlistId: string }; error?: { message: string } };
      if (!res.ok) {
        setAcceptError(body.error?.message ?? "Couldn't join this playlist.");
        setIsAccepting(false);
        return;
      }
      router.replace(`/playlists/${body.data!.playlistId}`);
    } catch {
      setAcceptError("Something went wrong. Please try again.");
      setIsAccepting(false);
    }
  }

  function handleDecline() {
    router.replace("/playlists");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      {isLoading && <p className="text-sm text-muted-foreground">Loading invite...</p>}

      {isError && (
        <div>
          <p className="mb-4 text-sm text-destructive">{error?.message ?? "Couldn't load this invite."}</p>
          <Button variant="outline" onClick={() => router.replace("/playlists")}>
            Go to playlists
          </Button>
        </div>
      )}

      {preview && preview.alreadyMember && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            You're already a collaborator on &ldquo;{preview.playlistName}&rdquo;.
          </p>
          <Button onClick={() => router.replace(`/playlists/${preview.playlistId}`)}>Open playlist</Button>
        </div>
      )}

      {preview && !preview.alreadyMember && (
        <div className="w-full rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{preview.invitedByName} invited you to collaborate on</p>
          <p className="mt-1 text-lg font-semibold">{preview.playlistName}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Accepting lets you add tracks to this playlist. You can leave anytime.
          </p>

          {acceptError && <p className="mt-3 text-xs text-destructive">{acceptError}</p>}

          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? "Joining..." : "Accept"}
            </Button>
            <Button variant="outline" onClick={handleDecline} disabled={isAccepting}>
              Decline
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
