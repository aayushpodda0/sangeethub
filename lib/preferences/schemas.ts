import { z } from "zod";

import { ACTIVITIES, LANGUAGES, MOODS } from "@/lib/music/taxonomy";

const language = z.enum(LANGUAGES);
const mood = z.enum(MOODS);

export const preferenceSchema = z.object({
  languages: z.array(language).max(9),
  genres: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(20),
  moods: z.array(mood).max(10),
  onboardingCompleted: z.boolean().optional(),
  onboardingSkipped: z.boolean().optional(),
});

export type PreferenceInput = z.infer<typeof preferenceSchema>;
export const preferenceEnums = { languages: LANGUAGES, moods: MOODS, activities: ACTIVITIES };
