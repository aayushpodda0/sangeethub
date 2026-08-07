import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "@/lib/auth/schemas";

describe("auth validation schemas", () => {
  it("accepts valid signup payload", () => {
    const parsed = signupSchema.safeParse({
      name: "Aayush",
      username: "aayush_01",
      email: "aayush@example.com",
      password: "Secure123",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects weak password", () => {
    const parsed = signupSchema.safeParse({
      name: "Aayush",
      username: "aayush_01",
      email: "aayush@example.com",
      password: "weak",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires password in login schema", () => {
    const parsed = loginSchema.safeParse({
      email: "aayush@example.com",
      password: "",
    });
    expect(parsed.success).toBe(false);
  });
});

