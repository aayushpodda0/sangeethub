"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JoinPlaylistPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<"joining" | "error">("joining");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function join() {
      try {
        const res = await fetch(`/api/playlists/join/${params.token}`, { method: "POST" });
        const body = (await res.json()) as {
          data?: { playlistId: string };
          error?: { message: string };
        };

        if (cancelled) return;

        if (!res.ok) {
          setStatus("error");
          setMessage(body.error?.message ?? "Couldn't join this playlist.");
          return;
        }

        router.replace(`/playlists/${body.data!.playlistId}`);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong. Please try again.");
        }
      }
    }

    join();
    return () => {
      cancelled = true;
    };
  }, [params.token, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      {status === "joining" && <p className="text-sm text-muted-foreground">Joining playlist...</p>}
      {status === "error" && <p className="text-sm text-destructive">{message}</p>}
    </main>
  );
}
