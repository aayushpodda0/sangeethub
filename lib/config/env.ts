const PLACEHOLDER_SECRETS = ["replace-with-a-long-random-secret", "changeme", "secret"];

/**
 * Returns a list of problems with the production environment (empty list = OK).
 * Pure function so it can be unit-tested; server.ts calls it at startup in production.
 */
export function findProductionEnvProblems(env: Record<string, string | undefined>): string[] {
  const problems: string[] = [];

  if (!env.DATABASE_URL) problems.push("DATABASE_URL is not set.");
  if (!env.NEXTAUTH_URL) problems.push("NEXTAUTH_URL is not set (must be your public https URL).");

  const secret = env.NEXTAUTH_SECRET;
  if (!secret) {
    problems.push("NEXTAUTH_SECRET is not set.");
  } else if (PLACEHOLDER_SECRETS.includes(secret)) {
    problems.push("NEXTAUTH_SECRET is still the placeholder from .env.example - generate a real one.");
  } else if (secret.length < 32) {
    problems.push("NEXTAUTH_SECRET is too short (use at least 32 characters: openssl rand -base64 32).");
  }

  return problems;
}
