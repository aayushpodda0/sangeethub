"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState, type PropsWithChildren } from "react";
import { Toaster } from "sonner";

import { PlayerShell } from "@/components/player/player-shell";
import { AppShell } from "@/components/shell/app-shell";

export function Providers({ children, session }: PropsWithChildren<{ session?: Session | null }>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
