"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  PartyParticipantInfo,
  PartyPlaybackState,
  PartyQueueItemInfo,
  ServerToClientEvents,
} from "@/lib/party/types";

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export function usePartySocket(roomCode: string) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [roomName, setRoomName] = useState("");
  const [hostId, setHostId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<PartyParticipantInfo[]>([]);
  const [queue, setQueue] = useState<PartyQueueItemInfo[]>([]);
  const [playback, setPlayback] = useState<PartyPlaybackState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      path: "/api/socket",
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("room:join", roomCode);
    });
    socket.io.on("reconnect_attempt", () => setStatus("reconnecting"));
    socket.on("disconnect", () => setStatus("disconnected"));

    socket.on("room:state", (state) => {
      setRoomName(state.name);
      setHostId(state.hostId);
      setParticipants(state.participants);
      setQueue(state.queue);
      setPlayback(state.playback);
    });
    socket.on("room:error", (payload) => setErrorMessage(payload.message));
    socket.on("participant:joined", (participant) => {
      setParticipants((prev) => [...prev.filter((p) => p.userId !== participant.userId), participant]);
    });
    socket.on("participant:left", ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    });
    socket.on("queue:updated", setQueue);
    socket.on("playback:sync", setPlayback);

    return () => {
      socket.emit("room:leave");
      socket.disconnect();
    };
  }, [roomCode]);

  return {
    status,
    roomName,
    hostId,
    participants,
    queue,
    playback,
    errorMessage,
    dismissError: () => setErrorMessage(null),
    addTrack: (trackId: string) => socketRef.current?.emit("queue:add", { trackId }),
    removeTrack: (queueItemId: string) => socketRef.current?.emit("queue:remove", { queueItemId }),
    vote: (queueItemId: string, voteType: "UP" | "DOWN") =>
      socketRef.current?.emit("queue:vote", { queueItemId, voteType }),
    play: () => socketRef.current?.emit("playback:play"),
    pause: () => socketRef.current?.emit("playback:pause"),
    skip: () => socketRef.current?.emit("playback:skip"),
    seek: (positionSeconds: number) => socketRef.current?.emit("playback:seek", { positionSeconds }),
    heartbeat: (positionSeconds: number) =>
      socketRef.current?.emit("playback:heartbeat", { positionSeconds }),
  };
}
