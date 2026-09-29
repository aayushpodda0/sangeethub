"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Pause, Play, SkipForward, ThumbsDown, ThumbsUp, Users, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePartySocket } from "@/lib/party/use-party-socket";
import { cn, formatDuration } from "@/lib/utils";
import type { DiscoveryTrack } from "@/types/music";

async function fetchTrack(trackId: string): Promise<DiscoveryTrack> {
  const res = await fetch(`/api/tracks/${trackId}`);
  const body = (await res.json()) as { data?: { track: DiscoveryTrack } };
  if (!res.ok) throw new Error("Couldn't load current track.");
  return body.data!.track;
}

async function searchTracks(query: string): Promise<DiscoveryTrack[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { data: { tracks: DiscoveryTrack[] } };
  return body.data.tracks;
}

export function PartyRoom({ roomCode, currentUserId }: { roomCode: string; currentUserId: string }) {
  const {
    status,
    roomName,
    hostId,
    participants,
    queue,
    playback,
    errorMessage,
    dismissError,
    addTrack,
    removeTrack,
    vote,
    play,
    pause,
    skip,
    seek,
    heartbeat,
  } = usePartySocket(roomCode);

  const isHost = hostId === currentUserId;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [displayPosition, setDisplayPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data: currentTrack } = useQuery({
    queryKey: ["party-current-track", playback?.currentTrackId],
    queryFn: () => fetchTrack(playback!.currentTrackId!),
    enabled: !!playback?.currentTrackId,
  });

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["party-search", debouncedSearch],
    queryFn: () => searchTracks(debouncedSearch),
    enabled: debouncedSearch.trim().length > 0,
  });

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
      dismissError();
    }
  }, [errorMessage, dismissError]);

  // Keep the local <audio> element in sync with the room's playback state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playback) return;

    const liveExpected = playback.isPlaying
      ? playback.positionSeconds + (Date.now() - playback.asOf) / 1000
      : playback.positionSeconds;

    if (Math.abs(audio.currentTime - liveExpected) > 1.5) {
      audio.currentTime = liveExpected;
    }
    if (playback.isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playback, currentTrack?.previewUrl]);

  // Ticking display clock for the progress bar.
  useEffect(() => {
    if (!playback) return;
    const interval = setInterval(() => {
      const base = playback.isPlaying ? (Date.now() - playback.asOf) / 1000 : 0;
      setDisplayPosition(playback.positionSeconds + base);
    }, 500);
    return () => clearInterval(interval);
  }, [playback]);

  // Host heartbeat: keep the DB/room position roughly fresh so late joiners land close.
  useEffect(() => {
    if (!isHost || !playback?.isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current) heartbeat(audioRef.current.currentTime);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost, playback?.isPlaying, heartbeat]);

  function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    toast.success("Room link copied");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
      <audio ref={audioRef} src={currentTrack?.previewUrl} preload="auto" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{roomName || "Party room"}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Code: <span className="font-mono tracking-widest text-foreground">{roomCode}</span>
            </span>
            {status !== "connected" && (
              <span className="flex items-center gap-1 text-destructive">
                <WifiOff className="size-3" />
                {status === "reconnecting" ? "Reconnecting..." : "Connecting..."}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={copyRoomLink} className="gap-2">
          <Copy className="size-4" />
          Copy invite link
        </Button>
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        {currentTrack ? (
          <>
            <p className="text-lg font-medium">{currentTrack.title}</p>
            <p className="text-sm text-muted-foreground">{currentTrack.artistNames.join(", ")}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{
                  width: `${Math.min((displayPosition / (currentTrack.durationSeconds || 1)) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(displayPosition)}</span>
              <span>{formatDuration(currentTrack.durationSeconds)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing playing yet. {isHost ? "Skip to start the queue." : "Waiting for the host to start."}
          </p>
        )}

        {isHost && (
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="icon"
              className="rounded-full"
              onClick={() => (playback?.isPlaying ? pause() : play())}
              disabled={!currentTrack}
              aria-label={playback?.isPlaying ? "Pause" : "Play"}
            >
              {playback?.isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={skip} aria-label="Skip to next track">
              <SkipForward className="size-4" />
            </Button>
            {currentTrack && (
              <input
                type="range"
                min={0}
                max={currentTrack.durationSeconds}
                value={Math.min(displayPosition, currentTrack.durationSeconds)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Seek"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-accent"
              />
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Queue</h2>

          <div className="relative mb-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks to add to the queue..."
              aria-label="Search tracks to add to queue"
            />
            {searchQuery.trim() && (
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-2">
                {isSearching && <li className="px-2 py-2 text-sm text-muted-foreground">Searching...</li>}
                {!isSearching && searchResults?.length === 0 && (
                  <li className="px-2 py-2 text-sm text-muted-foreground">No matches.</li>
                )}
                {!isSearching &&
                  searchResults?.map((track) => (
                    <li
                      key={track.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-muted"
                    >
                      <span className="truncate text-sm">
                        {track.title}{" "}
                        <span className="text-muted-foreground">— {track.artistNames.join(", ")}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          addTrack(track.id);
                          setSearchQuery("");
                        }}
                        className="shrink-0 text-xs text-accent hover:underline"
                      >
                        Add
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {queue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Queue is empty. Add a track above.</p>
          ) : (
            <ul className="space-y-1">
              {queue.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted">
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      aria-label="Vote up"
                      aria-pressed={item.myVote === "UP"}
                      onClick={() => vote(item.id, "UP")}
                      className={cn("rounded p-0.5", item.myVote === "UP" ? "text-accent" : "text-muted-foreground")}
                    >
                      <ThumbsUp className="size-3.5" />
                    </button>
                    <span className="text-xs tabular-nums">{item.voteScore}</span>
                    <button
                      type="button"
                      aria-label="Vote down"
                      aria-pressed={item.myVote === "DOWN"}
                      onClick={() => vote(item.id, "DOWN")}
                      className={cn(
                        "rounded p-0.5",
                        item.myVote === "DOWN" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      <ThumbsDown className="size-3.5" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.trackTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.artistNames.join(", ")} • added by {item.addedByName}
                    </p>
                  </div>
                  {(isHost || item.addedById === currentUserId) && (
                    <button
                      type="button"
                      aria-label={`Remove ${item.trackTitle} from queue`}
                      onClick={() => removeTrack(item.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" />
            Listening now ({participants.length})
          </h2>
          <ul className="space-y-1.5">
            {participants.map((p) => (
              <li key={p.userId} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                {p.role === "HOST" && <span className="text-xs text-accent">Host</span>}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
