import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { skipUserMusicOnboarding } from "@/lib/preferences/service";

export async function POST() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    return apiSuccess(await skipUserMusicOnboarding(userId));
  } catch (error) {
    console.error("[preferences:skip] failed:", error);
    return apiError(500, "PREFERENCES_SKIP_FAILED", "Couldn't skip onboarding.");
  }
}
