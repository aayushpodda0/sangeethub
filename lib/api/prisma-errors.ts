/** Extracts a Prisma error code (e.g. P2002 unique violation, P2003 foreign-key) without importing Prisma. */
export function prismaErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}
