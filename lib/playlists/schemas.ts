import { z } from "zod";

export const createPlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  isPublic: z.boolean().optional().default(false),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long").optional(),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  coverUrl: z.string().url("Must be a valid URL").nullable().optional(),
  isPublic: z.boolean().optional(),
  isCollaborative: z.boolean().optional(),
});

export const addTrackSchema = z.object({
  trackId: z.string().min(1, "trackId is required"),
});

export const reorderTracksSchema = z.object({
  orderedPlaylistTrackIds: z.array(z.string()).min(1, "At least one track id is required"),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type AddTrackInput = z.infer<typeof addTrackSchema>;
export type ReorderTracksInput = z.infer<typeof reorderTracksSchema>;
