"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import type { SmartPlaylistRule, SmartPlaylistRules } from "@/lib/playlists/schemas";
import { ACTIVITIES, LANGUAGES, MOODS } from "@/lib/music/taxonomy";
import { Button } from "@/components/ui/button";

const fields = [
  ["genre", "Genre"],
  ["language", "Language"],
  ["mood", "Mood"],
  ["activity", "Activity"],
  ["artist", "Artist slug or ID"],
  ["liked", "Liked status"],
  ["recentlyPlayed", "Recently played"],
  ["releaseDate", "Release date"],
] as const;

function createRule(field: SmartPlaylistRule["field"]): SmartPlaylistRule {
  switch (field) {
    case "language":
      return { field, value: "ENGLISH" };
    case "mood":
      return { field, value: "FOCUS" };
    case "activity":
      return { field, value: "STUDY" };
    case "liked":
      return { field, value: true };
    case "recentlyPlayed":
      return { field, withinDays: 30 };
    case "releaseDate":
      return { field, operator: "after", value: new Date(0).toISOString() };
    default:
      return { field, value: "" };
  }
}

function ruleDescription(rule: SmartPlaylistRule): string {
  switch (rule.field) {
    case "liked":
      return rule.value ? "Liked tracks" : "Tracks you haven't liked";
    case "recentlyPlayed":
      return `Played in the last ${rule.withinDays} days`;
    case "releaseDate":
      return `${rule.operator === "after" ? "Released after" : "Released before"} ${rule.value.slice(0, 10)}`;
    default:
      return `${fields.find(([value]) => value === rule.field)?.[1]}: ${rule.value || "not set"}`;
  }
}

export function SmartPlaylistBuilder({
  value,
  onChange,
}: {
  value: SmartPlaylistRules;
  onChange: (rules: SmartPlaylistRules) => void;
}) {
  const [selectedField, setSelectedField] = useState<SmartPlaylistRule["field"]>("genre");

  function updateRule(index: number, patch: Partial<SmartPlaylistRule>) {
    onChange(value.map((rule, i) => (i === index ? ({ ...rule, ...patch } as SmartPlaylistRule) : rule)));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/30 p-3">
      <div>
        <p className="text-sm font-medium">Rules</p>
        <p className="text-xs text-muted-foreground">All rules must match. The playlist refreshes when opened.</p>
      </div>

      {value.map((rule, index) => (
        <div key={`${rule.field}-${index}`} className="flex flex-wrap items-center gap-2">
          <select
            value={rule.field}
            onChange={(event) => {
              const next = event.target.value as SmartPlaylistRule["field"];
              if (value.some((item, i) => i !== index && item.field === next)) return;
              updateRule(index, createRule(next));
            }}
            aria-label={`Smart rule ${index + 1} field`}
            className="min-w-36 rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
          >
            {fields.map(([field, label]) => (
              <option key={field} value={field} disabled={value.some((item, i) => i !== index && item.field === field)}>
                {label}
              </option>
            ))}
          </select>

          {rule.field === "liked" ? (
            <select
              value={String(rule.value)}
              onChange={(event) => updateRule(index, { value: event.target.value === "true" })}
              aria-label={`Smart rule ${index + 1} value`}
              className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
            >
              <option value="true">Liked</option>
              <option value="false">Not liked</option>
            </select>
          ) : rule.field === "recentlyPlayed" ? (
            <input
              type="number"
              min={1}
              max={3650}
              value={rule.withinDays}
              onChange={(event) => updateRule(index, { withinDays: Number(event.target.value) || 1 })}
              aria-label={`Smart rule ${index + 1} days`}
              className="w-24 rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
            />
          ) : rule.field === "releaseDate" ? (
            <>
              <select
                value={rule.operator}
                onChange={(event) => updateRule(index, { operator: event.target.value as "before" | "after" })}
                aria-label={`Smart rule ${index + 1} date operator`}
                className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
              >
                <option value="after">After</option>
                <option value="before">Before</option>
              </select>
              <input
                type="date"
                value={rule.value.slice(0, 10)}
                onChange={(event) =>
                  updateRule(index, { value: new Date(`${event.target.value}T00:00:00.000Z`).toISOString() })
                }
                aria-label={`Smart rule ${index + 1} release date`}
                className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
              />
            </>
          ) : rule.field === "language" || rule.field === "mood" || rule.field === "activity" ? (
            <select
              value={rule.value}
              onChange={(event) => updateRule(index, { value: event.target.value })}
              aria-label={`Smart rule ${index + 1} value`}
              className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
            >
              {(rule.field === "language" ? LANGUAGES : rule.field === "mood" ? MOODS : ACTIVITIES).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={rule.value}
              onChange={(event) => updateRule(index, { value: event.target.value })}
              placeholder={rule.field === "artist" ? "artist slug or ID" : rule.field.toLowerCase()}
              aria-label={`Smart rule ${index + 1} value`}
              className="min-w-40 flex-1 rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
            />
          )}

          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            aria-label={`Remove smart rule ${index + 1}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Minus className="size-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedField}
          onChange={(event) => setSelectedField(event.target.value as SmartPlaylistRule["field"])}
          aria-label="New smart rule field"
          className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm"
        >
          {fields.map(([field, label]) => (
            <option key={field} value={field} disabled={value.some((rule) => rule.field === field)}>
              {label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={value.length >= 8 || value.some((rule) => rule.field === selectedField)}
          onClick={() => onChange([...value, createRule(selectedField)])}
        >
          <Plus className="size-3.5" /> Add rule
        </Button>
        <p className="text-xs text-muted-foreground">{value.map(ruleDescription).join(" • ")}</p>
      </div>
    </div>
  );
}
