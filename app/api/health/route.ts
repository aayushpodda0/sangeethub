import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

// Liveness/readiness probe for load balancers and uptime monitors. Deliberately returns
// no version, config, or error details - only whether the app can reach its database.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}
