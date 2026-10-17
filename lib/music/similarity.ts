export type SimilarityInput = {
  language: string;
  moods: string[];
  activities: string[];
  genreNames: string[];
};

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;

/**
 * How alike two tracks are. Pure and deterministic - weights favour genre, then mood, then
 * activity, then language - so "similar tracks" is explainable rather than a black box.
 */
export function similarityScore(a: SimilarityInput, b: SimilarityInput): number {
  return (
    overlap(a.genreNames, b.genreNames) * 3 +
    overlap(a.moods, b.moods) * 2 +
    overlap(a.activities, b.activities) +
    (a.language === b.language ? 1 : 0)
  );
}
