import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in | SangeetHub",
};

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) {
    redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to SangeetHub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your playlists, recommendations, and listening history.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

