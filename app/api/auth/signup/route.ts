import { hash } from "bcryptjs";

import { apiError, apiSuccess } from "@/lib/api/response";
import { signupSchema } from "@/lib/auth/schemas";
import { prismaErrorCode } from "@/lib/api/prisma-errors";
import { prisma } from "@/lib/db/prisma";
import { createRateLimiter, getClientIp } from "@/lib/security/rate-limit";

// 10 signups per IP per 15 minutes: generous for humans, stops scripted account spam.
const signupLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

async function ensureUniqueUsername(baseUsername: string) {
  const normalized = baseUsername.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { username: normalized } });
  if (!exists) {
    return normalized;
  }

  for (let i = 1; i <= 1000; i += 1) {
    const candidate = `${normalized}${i}`;
    const collision = await prisma.user.findUnique({ where: { username: candidate } });
    if (!collision) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique username");
}

export async function POST(request: Request) {
  const rate = signupLimiter.check(getClientIp(request.headers));
  if (!rate.allowed) {
    const response = apiError(429, "RATE_LIMITED", "Too many signup attempts. Please try again later.");
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return response;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid signup details", parsed.error.flatten());
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return apiError(409, "EMAIL_EXISTS", "An account already exists with this email.");
    }

    const username = await ensureUniqueUsername(parsed.data.username);
    const passwordHash = await hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        name: parsed.data.name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });

    return apiSuccess(user, 201);
  } catch (error) {
    // Two simultaneous signups can both pass the pre-checks; the DB unique constraint is the real guard.
    if (prismaErrorCode(error) === "P2002") {
      return apiError(409, "EMAIL_EXISTS", "An account already exists with this email.");
    }
    console.error("[signup] failed:", error);
    return apiError(
      500,
      "SIGNUP_FAILED",
      "Something went wrong creating your account. Please check that the database is running and try again.",
    );
  }
}
