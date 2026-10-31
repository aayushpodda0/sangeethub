"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { useState, type PropsWithChildren } from "react";
import { Toaster } from "sonner";

import { PlayerShell } from "@/components/player/player-shell";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children, session }: PropsWithChildren<{ session?: Session | null }>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <PlayerShell>
            <AppShell>{children}</AppShell>
          </PlayerShell>
          <Toaster richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
