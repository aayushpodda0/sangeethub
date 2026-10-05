import { describe, expect, it } from "vitest";

import { formatDuration } from "@/lib/utils";

describe("formatDuration", () => {
  it("formats whole minutes", () => {
    expect(formatDuration(180)).toBe("3:00");
  });

  it("pads single-digit seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(59.9)).toBe("0:59");
  });

  it("returns 0:00 for negative or non-finite input", () => {
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
    expect(formatDuration(Infinity)).toBe("0:00");
  });

  it("handles durations over an hour as raw minutes (no hour segment)", () => {
    expect(formatDuration(3725)).toBe("62:05");
  });
});
