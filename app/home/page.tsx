import type { Metadata } from "next";

import { SignOutButton } from "@/components/auth/signout-button";
import { getAuthSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Home | SangeetHub",
};

const recommendationSamples = [
  "Because you listen to this artist.",
  "Similar genre to your study playlist.",
  "New release from an artist you follow.",
];

export default async function DashboardPage() {
  const session = await getAuthSession();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session?.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            Role: {session?.user.role} • @{session?.user.username}
          </p>
        </div>
        <SignOutButton />
      </header>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Recommendation transparency preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          In upcoming phases, all recommended tracks and playlists will include one clear reason.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm">
          {recommendationSamples.map((sample) => (
            <li key={sample}>{sample}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

