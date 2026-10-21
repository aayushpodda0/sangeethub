import { fallbackGradient } from "@/lib/ui/gradient";
import { cn } from "@/lib/utils";

type ArtworkProps = {
  src?: string | null;
  /** Stable id used to pick the generated fallback gradient when there's no image. */
  seed: string;
  alt: string;
  className?: string;
  round?: boolean;
  /** Hide from assistive tech when nearby text already names the item (rows, thumbnails). */
  decorative?: boolean;
};

/** Cover art / artist image. Falls back to deterministic CSS artwork without external media. */
export function Artwork({
  src,
  seed,
  alt,
  className,
  round = false,
  decorative = false,
}: ArtworkProps) {
  const gradient = fallbackGradient(seed);
  const image = src ? `url("${src.replace(/"/g, "%22")}"), ` : "";

  return (
    <div
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": alt })}
      className={cn(
        "relative shrink-0 overflow-hidden bg-cover bg-center",
        round ? "rounded-full" : "rounded-xl",
        className,
      )}
      style={{ backgroundImage: `${image}${gradient}` }}
    >
      <span className="artwork-texture pointer-events-none absolute inset-0" aria-hidden />
    </div>
  );
}
