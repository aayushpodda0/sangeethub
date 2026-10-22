import { redirect } from "next/navigation";

import { PreferencesForm } from "@/components/preferences/preferences-form";
import { getAuthSession } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <div className="surface-card w-full p-6 sm:p-10">
        <PreferencesForm onboarding />
      </div>
    </main>
  );
}
