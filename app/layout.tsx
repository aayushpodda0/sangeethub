import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PlayerBar } from "@/components/player/player-bar";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SangeetHub",
  description: "Music discovery and demo streaming with transparent recommendations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <div className="pb-56 md:pb-44">{children}</div>
          <PlayerBar />
        </Providers>
      </body>
    </html>
  );
}
