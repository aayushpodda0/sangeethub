import type { Activity, LanguageCode, Mood } from "@prisma/client";

// Single source of truth for the filter vocabularies. `satisfies` makes the compiler
// reject any value that isn't a real Prisma enum member.
export const MOODS = [
  "FOCUS", "WORKOUT", "RELAX", "TRAVEL", "PARTY", "SLEEP", "HAPPY", "SAD", "ENERGETIC", "CALM",
] as const satisfies readonly Mood[];

export const ACTIVITIES = [
  "STUDY", "GYM", "COMMUTE", "CODING", "YOGA", "RUNNING", "MEDITATION", "CELEBRATION", "SLEEPING",
] as const satisfies readonly Activity[];

export const LANGUAGES = [
  "HINDI", "MARATHI", "TAMIL", "TELUGU", "BENGALI", "MALAYALAM", "KANNADA", "PUNJABI", "ENGLISH",
] as const satisfies readonly LanguageCode[];
