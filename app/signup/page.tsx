import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/features/auth/components/signup-form";
import { getAuthSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create account | SangeetHub",
};

export default async function SignupPage() {
  const session = await getAuthSession();
  if (session) {
    redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Create your SangeetHub account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start exploring multilingual music with transparent recommendations.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </section>
    </main>
  );
}

