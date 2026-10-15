// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonRequest, prismaMock } from "../helpers/api";

vi.mock("@/lib/db/prisma", async () => ({ prisma: (await import("../helpers/api")).prismaMock }));

import { POST } from "@/app/api/auth/signup/route";

const valid = { name: "Test User", username: "test_user", email: "Test@Example.com", password: "Password1" };
let ipCounter = 0;
const post = (body: unknown, ip = `10.0.0.${++ipCounter}`) =>
  POST(jsonRequest("/api/auth/signup", "POST", body, { "x-forwarded-for": ip }));

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(null);
});

describe("POST /api/auth/signup", () => {
  it("400s on malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("400s on invalid fields with a structured error", async () => {
    const res = await post({ ...valid, password: "weak" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("409s when the email is already registered", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "existing" });
    const res = await post(valid);
    expect(res.status).toBe(409);
  });

  it("creates the user with a hashed (never plaintext) password and a lowercased email", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "u1", email: "test@example.com", username: "test_user", name: "Test User" });
    const res = await post(valid);

    expect(res.status).toBe(201);
    const data = prismaMock.user.create.mock.calls[0]![0].data;
    expect(data.email).toBe("test@example.com");
    expect(data.passwordHash).not.toBe(valid.password);
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    // The response must never leak the hash.
    expect(JSON.stringify(await res.json())).not.toContain("passwordHash");
  });

  it("409s (not 500) when a concurrent signup wins the unique-constraint race", async () => {
    prismaMock.user.create.mockRejectedValue({ code: "P2002" });
    const res = await post(valid);
    expect(res.status).toBe(409);
  });

  it("rate-limits repeated signups from one IP with a Retry-After header", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "u", email: "a@b.co", username: "u", name: "N" });
    const ip = "203.0.113.50";
    const statuses: number[] = [];
    let last: Response | undefined;
    for (let i = 0; i < 12; i++) {
      last = await post(valid, ip);
      statuses.push(last.status);
    }
    expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    expect(Number(last!.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
