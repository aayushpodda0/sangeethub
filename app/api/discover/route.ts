import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/response";
import { musicService } from "@/lib/music/service";
import { ACTIVITIES, LANGUAGES, MOODS } from "@/lib/music/taxonomy";

const querySchema = z.object({
  mood: z.enum(MOODS).optional(),
  activity: z.enum(ACTIVITIES).optional(),
  language: z.enum(LANGUAGES).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    mood: searchParams.get("mood") ?? undefined,
    activity: searchParams.get("activity") ?? undefined,
    language: searchParams.get("language") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Unknown mood, activity, or language filter.");
  }
  const { mood, activity, language } = parsed.data;

  try {
    const tracks = await musicService.discoverTracks({ mood, activity, language });
    return apiSuccess({ tracks });
  } catch (error) {
    console.error("[discover] failed:", error);
    return apiError(500, "DISCOVER_FAILED", "Couldn't load discovery results. Please try again.");
  }
}
