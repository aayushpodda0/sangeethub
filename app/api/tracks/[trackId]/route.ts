import { apiError, apiSuccess } from "@/lib/api/response";
import { musicService } from "@/lib/music/service";


type RouteParams = { params: Promise<{ trackId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { trackId } = await params;

  try {
    const track = await musicService.getTrackById(trackId);
    if (!track) {
      return apiError(404, "TRACK_NOT_FOUND", "That track doesn't exist.");
    }
    return apiSuccess({ track });
  } catch (error) {
    console.error("[tracks:get] failed:", error);
    return apiError(500, "TRACK_LOAD_FAILED", "Couldn't load this track. Please try again.");
  }
}
