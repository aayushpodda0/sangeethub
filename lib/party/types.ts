export type PartyParticipantInfo = {
  userId: string;
  name: string;
  username: string;
  role: "HOST" | "GUEST";
};

export type PartyQueueItemInfo = {
  id: string;
  trackId: string;
  trackTitle: string;
  artistNames: string[];
  durationSeconds: number;
  previewUrl: string;
  addedById: string;
  addedByName: string;
  voteScore: number;
  myVote: "UP" | "DOWN" | null;
};

export type PartyPlaybackState = {
  currentTrackId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  /** Server timestamp (ms) this state was true at - clients extrapolate drift from this. */
  asOf: number;
};

export type PartyRoomState = {
  roomCode: string;
  name: string;
  hostId: string;
  participants: PartyParticipantInfo[];
  queue: PartyQueueItemInfo[];
  playback: PartyPlaybackState;
};

// Client -> Server
export type ClientToServerEvents = {
  "room:join": (roomCode: string) => void;
  "room:leave": () => void;
  "queue:add": (payload: { trackId: string }) => void;
  "queue:remove": (payload: { queueItemId: string }) => void;
  "queue:vote": (payload: { queueItemId: string; voteType: "UP" | "DOWN" }) => void;
  "playback:play": () => void;
  "playback:pause": () => void;
  "playback:skip": () => void;
  "playback:seek": (payload: { positionSeconds: number }) => void;
  "playback:heartbeat": (payload: { positionSeconds: number }) => void;
};

// Server -> Client
export type ServerToClientEvents = {
  "room:state": (state: PartyRoomState) => void;
  "room:error": (payload: { message: string }) => void;
  "participant:joined": (participant: PartyParticipantInfo) => void;
  "participant:left": (payload: { userId: string }) => void;
  "queue:updated": (queue: PartyQueueItemInfo[]) => void;
  "playback:sync": (playback: PartyPlaybackState) => void;
};
