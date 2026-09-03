import { hash } from "bcryptjs";

import { apiError, apiSuccess } from "@/lib/api/response";
import { signupSchema } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db/prisma";

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
    console.error("[signup] failed:", error);
    return apiError(
      500,
      "SIGNUP_FAILED",
      "Something went wrong creating your account. Please check that the database is running and try again.",
    );
  }
}
