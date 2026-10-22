import { z } from "zod";
import { ACTIVITIES, LANGUAGES, MOODS } from "@/lib/music/taxonomy";

const smartRuleFields = [
  "genre",
  "language",
  "mood",
  "activity",
  "artist",
  "liked",
  "recentlyPlayed",
  "releaseDate",
] as const;

const smartRuleSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("genre"), value: z.string().min(1).max(80) }),
  z.object({ field: z.literal("language"), value: z.enum(LANGUAGES) }),
  z.object({ field: z.literal("mood"), value: z.enum(MOODS) }),
  z.object({ field: z.literal("activity"), value: z.enum(ACTIVITIES) }),
  z.object({ field: z.literal("artist"), value: z.string().min(1).max(100) }),
  z.object({ field: z.literal("liked"), value: z.boolean() }),
  z.object({
    field: z.literal("recentlyPlayed"),
    withinDays: z.number().int().min(1).max(3650),
  }),
  z.object({
    field: z.literal("releaseDate"),
    operator: z.enum(["before", "after"]),
    value: z.string().datetime({ offset: true }),
  }),
]);

export const smartRulesSchema = z
  .array(smartRuleSchema)
  .min(1, "Add at least one rule")
  .max(8, "You can add up to 8 rules")
  .superRefine((rules, context) => {
    const fields = new Set<string>();
    for (const [index, rule] of rules.entries()) {
      if (fields.has(rule.field)) {
        context.addIssue({
          code: "custom",
          path: [index, "field"],
          message: "Each rule field can only be used once.",
        });
      }
      fields.add(rule.field);
    }
  });

export const createPlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  isPublic: z.boolean().optional().default(false),
  isSmart: z.boolean().optional().default(false),
  smartRules: smartRulesSchema.optional(),
}).superRefine((value, context) => {
  if (value.isSmart && !value.smartRules) {
    context.addIssue({ code: "custom", path: ["smartRules"], message: "Smart playlists need at least one rule." });
  }
  if (!value.isSmart && value.smartRules) {
    context.addIssue({ code: "custom", path: ["smartRules"], message: "Rules are only valid for smart playlists." });
  }
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long").optional(),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  coverUrl: z
    .string()
    .url("Must be a valid URL")
    .refine((v) => /^https?:\/\//i.test(v), "Cover URL must start with http:// or https://")
    .nullable()
    .optional(),
  isPublic: z.boolean().optional(),
  isCollaborative: z.boolean().optional(),
  folderId: z.string().nullable().optional(),
  isSmart: z.boolean().optional(),
  smartRules: smartRulesSchema.nullable().optional(),
}).superRefine((value, context) => {
  if (value.isSmart === true && !value.smartRules) {
    context.addIssue({ code: "custom", path: ["smartRules"], message: "Smart playlists need at least one rule." });
  }
});

export const addTrackSchema = z.object({
  trackId: z.string().min(1, "trackId is required"),
});

export const reorderTracksSchema = z.object({
  orderedPlaylistTrackIds: z.array(z.string()).min(1, "At least one track id is required"),
});

export const updateCollaboratorSchema = z.object({
  permission: z.enum(["CONTRIBUTOR", "MODERATOR"]).optional(),
  canRemoveOthers: z.boolean().optional(),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type AddTrackInput = z.infer<typeof addTrackSchema>;
export type ReorderTracksInput = z.infer<typeof reorderTracksSchema>;
export type SmartPlaylistRule = z.infer<typeof smartRuleSchema>;
export type SmartPlaylistRules = z.infer<typeof smartRulesSchema>;
export { smartRuleFields };
