import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--color-accent-soft),_transparent_45%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="text-xl font-semibold tracking-tight">SangeetHub</span>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-4 py-12 sm:px-6 sm:py-20">
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          Portfolio-ready music discovery platform
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Discover music with clarity, context, and collaboration.
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          SangeetHub helps you discover multilingual and regional music through transparent
          recommendations, better playlist organization, and collaborative listening experiences.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/home">Open demo home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
