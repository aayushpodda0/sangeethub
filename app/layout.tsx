import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { Providers } from "@/components/providers";
import { getAuthSession } from "@/lib/auth/session";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "SangeetHub",
  description: "Music discovery and demo streaming with transparent recommendations.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getAuthSession();

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
