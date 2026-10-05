import type { PartyPlaybackState } from "@/lib/party/types";

/** Derives the live playback position from the DB's stored (startedAt, playbackPosition) pair. */
export function computePlaybackState(room: {
  currentTrackId: string | null;
  startedAt: Date | null;
  playbackPosition: number;
}): PartyPlaybackState {
  const isPlaying = room.startedAt !== null;
  const positionSeconds = isPlaying
    ? room.playbackPosition + (Date.now() - room.startedAt!.getTime()) / 1000
    : room.playbackPosition;

  return {
    currentTrackId: room.currentTrackId,
    isPlaying,
    positionSeconds,
    asOf: Date.now(),
  };
}
