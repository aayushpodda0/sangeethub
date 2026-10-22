import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { getUserMusicPreferences, saveUserMusicPreferences } from "@/lib/preferences/service";
import { preferenceSchema } from "@/lib/preferences/schemas";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    return apiSuccess(await getUserMusicPreferences(userId));
  } catch (error) {
    console.error("[preferences:load] failed:", error);
    return apiError(500, "PREFERENCES_LOAD_FAILED", "Couldn't load your preferences.");
  }
}

export async function PUT(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const parsed = preferenceSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid music preferences.", parsed.error.flatten());
  }

  try {
    return apiSuccess(await saveUserMusicPreferences(userId, parsed.data));
  } catch (error) {
    console.error("[preferences:save] failed:", error);
    return apiError(500, "PREFERENCES_SAVE_FAILED", "Couldn't save your preferences.");
  }
}
