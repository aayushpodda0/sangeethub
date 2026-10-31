import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const labels = {
  track: "TRACK",
  album: "ALBUM",
  artist: "ARTIST",
  playlist: "PLAYLIST",
  profile: "PROFILE",
  party: "PARTY ROOM",
} as const;

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = (params.get("title") ?? "SangeetHub").slice(0, 100);
  const subtitle = (params.get("subtitle") ?? "Regional music discovery with transparent recommendations.").slice(
    0,
    180,
  );
  const kind = params.get("kind") as keyof typeof labels;
  const label = labels[kind] ?? "MUSIC DISCOVERY";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#151311",
          color: "#f8f0df",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ color: "#ef9b43", display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>
          SANGEETHUB
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ color: "#ef9b43", display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>
            {label}
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          <div style={{ color: "#c9bda9", display: "flex", fontSize: 28, lineHeight: 1.25 }}>{subtitle}</div>
        </div>
        <div style={{ color: "#8f8372", display: "flex", fontSize: 22 }}>
          Regional music discovery · Explainable recommendations · Shared listening
        </div>
      </div>
    ),
    { height: 630, width: 1200 },
  );
}
