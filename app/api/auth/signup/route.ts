import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { signupSchema } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db/prisma";

type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function apiError(status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorResponse = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

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
  const json = await request.json();
  const parsed = signupSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid signup details", parsed.error.flatten());
  }

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

  return NextResponse.json({ data: user }, { status: 201 });
}

