import { z } from "zod";

/** Max tracks waiting in a single party queue - stops one client from flooding a room. */
export const MAX_PARTY_QUEUE_SIZE = 100;

export const roomCodeSchema = z
  .string()
  .length(6)
  .regex(/^[A-Z0-9]+$/);

export const queueAddSchema = z.object({ trackId: z.string().min(1).max(64) });

export const queueRemoveSchema = z.object({ queueItemId: z.string().min(1).max(64) });

export const queueVoteSchema = z.object({
  queueItemId: z.string().min(1).max(64),
  voteType: z.enum(["UP", "DOWN"]),
});

/** Seek/heartbeat position: finite, non-negative, capped at 24h so garbage can't be persisted. */
export const positionSchema = z.object({
  positionSeconds: z.number().finite().min(0).max(86_400),
});
