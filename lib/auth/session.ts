import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";

export function getAuthSession() {
  return getServerSession(authOptions).catch((error: unknown) => {
    if (error instanceof Error && error.name === "JWTSessionError") {
      return null;
    }
    throw error;
  });
}
