import { MusicService } from "@/lib/music/service";

/** Backwards-compatible name for existing consumers and tests. */
export class DemoMusicProvider extends MusicService {
  override readonly name = "demo";
}
