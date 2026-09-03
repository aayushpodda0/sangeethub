"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState, type PropsWithChildren } from "react";
import { Toaster } from "sonner";

import { PlayerShell } from "@/components/player/player-shell";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <PlayerShell>{children}</PlayerShell>
          <Toaster richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

