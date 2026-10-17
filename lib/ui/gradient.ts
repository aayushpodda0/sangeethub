const PAIRS = [
  ["#F2542D", "#F6A623"],
  ["#7A2E3D", "#F2542D"],
  ["#1F3A5F", "#3E7CB1"],
  ["#2D6A4F", "#95D5B2"],
  ["#5C2A5A", "#C2457A"],
  ["#C2410C", "#FDBA74"],
  ["#0F4C5C", "#E36414"],
  ["#3A0CA3", "#F72585"],
] as const;

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic generated-gradient artwork for anything without a real image (no copyrighted art needed). */
export function fallbackGradient(seed: string): string {
  const [from, to] = PAIRS[hashString(seed) % PAIRS.length]!;
  return `linear-gradient(135deg, ${from}, ${to})`;
}
