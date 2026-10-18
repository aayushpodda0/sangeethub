import { apiError, apiSuccess } from "@/lib/api/response";
import { musicService } from "@/lib/music/service";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return apiSuccess({ tracks: [], query: "" });
  }

  if (query.length > 100) {
    return apiError(400, "QUERY_TOO_LONG", "Search query is too long.");
  }

  try {
    const tracks = await musicService.searchTracks(query);
    return apiSuccess({ tracks, query });
  } catch {
    return apiError(500, "SEARCH_FAILED", "Something went wrong while searching. Please try again.");
  }
}
