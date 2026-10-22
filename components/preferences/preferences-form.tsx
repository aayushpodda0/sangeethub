"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn, titleCase } from "@/lib/utils";
import { LANGUAGES, MOODS } from "@/lib/music/taxonomy";

type PreferenceData = {
  languages: string[];
  genres: string[];
  moods: string[];
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
};
type Genre = { slug: string; name: string };
type PreferenceOption = { id: string; label: string };

async function fetchPreferences(): Promise<PreferenceData> {
  const response = await fetch("/api/preferences");
  const body = (await response.json()) as { data?: PreferenceData; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Couldn't load preferences.");
  return body.data!;
}

async function fetchGenres(): Promise<Genre[]> {
  const response = await fetch("/api/preferences/genres");
  const body = (await response.json()) as { data?: { genres: Genre[] }; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Couldn't load genres.");
  return body.data?.genres ?? [];
}

export function PreferencesForm({ onboarding = false }: { onboarding?: boolean }) {
  const router = useRouter();
  const preferences = useQuery({ queryKey: ["preferences"], queryFn: fetchPreferences });
  const genres = useQuery({ queryKey: ["preference-genres"], queryFn: fetchGenres });
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<PreferenceData | null>(null);

  const value = selected ?? preferences.data ?? {
    languages: [],
    genres: [],
    moods: [],
    onboardingCompleted: false,
    onboardingSkipped: false,
  };

  const save = useMutation({
    mutationFn: async (payload: PreferenceData) => {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, onboardingCompleted: true, onboardingSkipped: false }),
      });
      const body = (await response.json()) as { data?: PreferenceData; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Couldn't save preferences.");
      return body.data!;
    },
    onSuccess: () => {
      toast.success("Your music preferences were saved");
      router.push("/home");
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const skip = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/preferences/skip", { method: "POST" });
      if (!response.ok) throw new Error("Couldn't skip onboarding.");
    },
    onSuccess: () => {
      router.push("/home");
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const options = useMemo<PreferenceOption[]>(() => {
    if (step === 0) return LANGUAGES.map((id) => ({ id, label: titleCase(id) }));
    if (step === 1) return (genres.data ?? []).map((genre) => ({ id: genre.slug, label: genre.name }));
    return MOODS.map((id) => ({ id, label: titleCase(id) }));
  }, [genres.data, step]);
  const field = step === 0 ? "languages" : step === 1 ? "genres" : "moods";

  function toggle(id: string) {
    setSelected({ ...value, [field]: value[field].includes(id) ? value[field].filter((item) => item !== id) : [...value[field], id] });
  }

  if (preferences.isLoading || genres.isLoading) {
    return <div className="skeleton-shimmer h-64 rounded-2xl" aria-label="Loading preferences" />;
  }
  if (preferences.isError || genres.isError) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Unable to load preference options. Please refresh and try again.</p>;
  }

  return (
    <section aria-labelledby="preference-title">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow">{onboarding ? "Personalize your listening" : "Your taste profile"}</p>
          <h1 id="preference-title" className="font-display mt-2 text-3xl font-medium">What should we play?</h1>
        </div>
        <span className="text-sm text-muted-foreground">{step + 1} / 3</span>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Choose any options that feel right. We use them to tune recommendations, not to limit your catalog.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const active = value[field].includes(option.id);
          return (
            <button key={option.id} type="button" aria-pressed={active} onClick={() => toggle(option.id)}
              className={cn("flex min-h-12 items-center justify-between rounded-xl border px-3 text-left text-sm transition", active ? "border-accent bg-accent/15 text-accent" : "border-border bg-card hover:border-accent/50")}>
              {option.label}
              {active && <Check className="size-4" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={() => (step === 0 ? skip.mutate() : setStep(step - 1))} disabled={skip.isPending || save.isPending}>
          {step === 0 ? "Skip for now" : <><ChevronLeft className="size-4" /> Back</>}
        </Button>
        {step < 2 ? <Button onClick={() => setStep(step + 1)}>Continue <ChevronRight className="size-4" /></Button> :
          <Button onClick={() => save.mutate(value)} disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />} Save preferences</Button>}
      </div>
    </section>
  );
}
