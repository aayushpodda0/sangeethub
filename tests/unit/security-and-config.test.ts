import { describe, expect, it } from "vitest";

import { prismaErrorCode } from "@/lib/api/prisma-errors";
import { findProductionEnvProblems } from "@/lib/config/env";
import { MAX_PARTY_QUEUE_SIZE, positionSchema, queueAddSchema, queueVoteSchema, roomCodeSchema } from "@/lib/party/validation";
import { createRateLimiter, getClientIp } from "@/lib/security/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with a retry hint", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect([1, 2, 3].map(() => limiter.check("ip").allowed)).toEqual([true, true, true]);
    now = 10_000;
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it("resets after the window and tracks keys independently", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
    now = 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  const h = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null });
  it("prefers the first x-forwarded-for hop, then x-real-ip, then 'unknown'", () => {
    expect(getClientIp(h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(getClientIp(h({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(getClientIp(h({}))).toBe("unknown");
  });
});

describe("findProductionEnvProblems", () => {
  const good = { DATABASE_URL: "postgres://x", NEXTAUTH_URL: "https://app.example.com", NEXTAUTH_SECRET: "a".repeat(40) };
  it("accepts a sound production environment", () => {
    expect(findProductionEnvProblems(good)).toEqual([]);
  });
  it("flags missing vars, the .env.example placeholder, and short secrets", () => {
    expect(findProductionEnvProblems({})).toHaveLength(3);
    expect(findProductionEnvProblems({ ...good, NEXTAUTH_SECRET: "replace-with-a-long-random-secret" })[0]).toMatch(/placeholder/);
    expect(findProductionEnvProblems({ ...good, NEXTAUTH_SECRET: "short" })[0]).toMatch(/too short/);
  });
});

describe("party socket payload schemas", () => {
  it("accepts well-formed payloads", () => {
    expect(roomCodeSchema.safeParse("ABC234").success).toBe(true);
    expect(queueAddSchema.safeParse({ trackId: "t1" }).success).toBe(true);
    expect(queueVoteSchema.safeParse({ queueItemId: "q", voteType: "DOWN" }).success).toBe(true);
    expect(positionSchema.safeParse({ positionSeconds: 12.5 }).success).toBe(true);
  });
  it("rejects everything a hostile client might send", () => {
    for (const bad of [undefined, null, 5, "str", [], {}]) {
      expect(queueAddSchema.safeParse(bad).success).toBe(false);
      expect(queueVoteSchema.safeParse(bad).success).toBe(false);
    }
    expect(roomCodeSchema.safeParse("abc234").success).toBe(false); // lowercase
    expect(roomCodeSchema.safeParse("ABC23").success).toBe(false); // too short
    expect(roomCodeSchema.safeParse({ $ne: null }).success).toBe(false);
    expect(queueVoteSchema.safeParse({ queueItemId: "q", voteType: "SIDEWAYS" }).success).toBe(false);
    for (const n of [NaN, Infinity, -1, 86_401, "5"]) {
      expect(positionSchema.safeParse({ positionSeconds: n }).success).toBe(false);
    }
    expect(queueAddSchema.safeParse({ trackId: "x".repeat(65) }).success).toBe(false);
  });
  it("caps queue size at a sane number", () => {
    expect(MAX_PARTY_QUEUE_SIZE).toBeGreaterThan(0);
    expect(MAX_PARTY_QUEUE_SIZE).toBeLessThanOrEqual(500);
  });
});

describe("prismaErrorCode", () => {
  it("extracts codes safely from anything", () => {
    expect(prismaErrorCode({ code: "P2002" })).toBe("P2002");
    expect(prismaErrorCode(new Error("x"))).toBeNull();
    expect(prismaErrorCode(null)).toBeNull();
    expect(prismaErrorCode({ code: 5 })).toBeNull();
  });
});
