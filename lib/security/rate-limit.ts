export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export type RateLimiter = {
  /** Records one attempt for `key` and says whether it is within the limit. */
  check(key: string): RateLimitResult;
};

type Options = {
  /** Max attempts allowed per key per window. */
  limit: number;
  windowMs: number;
  /** Injectable clock so tests don't need real timers. */
  now?: () => number;
};

/**
 * Fixed-window, in-memory rate limiter. No external dependency (no Redis) on purpose:
 * SangeetHub runs as a single long-lived Node process (custom server for Socket.IO), so
 * process memory is sufficient. If you ever run multiple instances, swap this for a shared
 * store - the `RateLimiter` interface is the only thing callers depend on.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: Options): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const t = now();

      // Opportunistic cleanup so the map can't grow without bound.
      if (windows.size > 5000) {
        for (const [k, w] of windows) if (w.resetAt <= t) windows.delete(k);
      }

      const existing = windows.get(key);
      if (!existing || existing.resetAt <= t) {
        windows.set(key, { count: 1, resetAt: t + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      existing.count += 1;
      if (existing.count > limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - t) / 1000) };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

/** Best-effort client IP. Only trustworthy behind a reverse proxy that sets x-forwarded-for. */
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
