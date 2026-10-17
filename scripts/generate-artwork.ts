/**
 * Generates the demo artwork (album covers, artist monograms, playlist covers) as static SVGs in
 * public/artwork. Deterministic: same input -> same output, so regenerating produces no diff.
 * Run with: npm run artwork:generate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ALBUMS, ARTISTS, PLAYLISTS } from "../prisma/seed-data";

const OUT = join(process.cwd(), "public", "artwork");

// [background start, background end, accent/sun] - warm, sunset-led but varied so covers are distinguishable.
const PALETTES: [string, string, string][] = [
  ["#F2542D", "#F6A623", "#5C2A3A"],
  ["#7A2E3D", "#F2542D", "#F6C66B"],
  ["#1F3A5F", "#3E7CB1", "#F6A623"],
  ["#2D6A4F", "#95D5B2", "#F6A623"],
  ["#5C2A5A", "#C2457A", "#F6A623"],
  ["#C2410C", "#FDBA74", "#7C2D12"],
  ["#0F4C5C", "#E36414", "#FB8B24"],
  ["#3A0CA3", "#F72585", "#FFB703"],
  ["#6B2D5C", "#F0544F", "#FFD166"],
  ["#264653", "#E9C46A", "#E76F51"],
];

function hash(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const palette = (seed: string) => PALETTES[hash(seed) % PALETTES.length]!;
const f = (n: number) => n.toFixed(1);

function cover(seed: string, label: string) {
  const [c1, c2, c3] = palette(seed);
  const r = rng(seed);
  const sunX = 140 + r() * 320;
  const sunY = 150 + r() * 160;
  const sunR = 70 + r() * 70;
  const wave = (y: number, amp: number, opacity: number) => {
    const a = amp * (0.6 + r() * 0.8);
    return `<path d="M0 ${f(y)} C 150 ${f(y - a)}, 300 ${f(y + a)}, 450 ${f(y - a / 2)} S 600 ${f(y + a / 3)} 600 ${f(y)} L600 600 L0 600Z" fill="#1a1210" opacity="${opacity}"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${label}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#g)"/>
<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(sunR)}" fill="${c3}" opacity="0.9"/>
<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(sunR * 1.45)}" fill="none" stroke="${c3}" stroke-opacity="0.35" stroke-width="3"/>
${wave(380, 50, 0.14)}
${wave(450, 45, 0.22)}
${wave(520, 35, 0.34)}
</svg>
`;
}

function portrait(seed: string, name: string) {
  const [c1, c2, c3] = palette(seed + "-artist");
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${name}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>
<circle cx="320" cy="90" r="46" fill="${c3}" opacity="0.85"/>
<path d="M0 330 C 100 290, 220 360, 400 300 L400 400 L0 400Z" fill="#1a1210" opacity="0.25"/>
<text x="200" y="232" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="140" font-weight="600" fill="#fff8f0" fill-opacity="0.95">${initials}</text>
</svg>
`;
}

const fileFor = (url: string) => join(OUT, url.replace(/^\/artwork\//, ""));

mkdirSync(OUT, { recursive: true });
let count = 0;
for (const a of ALBUMS) { writeFileSync(fileFor(a.artworkUrl), cover(a.slug, `${a.title} cover art`)); count++; }
for (const a of ARTISTS) { writeFileSync(fileFor(a.imageUrl), portrait(a.slug, a.name)); count++; }
for (const p of PLAYLISTS) { writeFileSync(fileFor(p.coverUrl), cover(`playlist-${p.slug}`, `${p.name} cover art`)); count++; }
console.log(`Generated ${count} artwork files in public/artwork`);
