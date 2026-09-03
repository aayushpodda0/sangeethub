import type { DiscoveryTrack } from "@/types/music";

// The canonical track shape used across the whole app (search, player, track/album/artist pages)
// is DiscoveryTrack, defined in types/music.ts. Aliased here so provider consumers can keep
// importing "ProviderTrack" without caring where the canonical type lives.
export type ProviderTrack = DiscoveryTrack;

export interface MusicProvider {
  name: string;
  searchTracks(query: string): Promise<ProviderTrack[]>;
  getTrackById(trackId: string): Promise<ProviderTrack | null>;
}
