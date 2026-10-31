import { describe, expect, it } from "vitest";

import {
  createPrivateMetadata,
  createShareMetadata,
  generatedShareImage,
} from "@/lib/seo/metadata";

describe("share metadata", () => {
  it("creates canonical Open Graph and Twitter metadata with a generated preview image", () => {
    const metadata = createShareMetadata({
      title: "Monsoon Metro",
      description: "A regional track on SangeetHub.",
      path: "/tracks/t1",
      kind: "track",
    });

    expect(metadata.title).toBe("Monsoon Metro | SangeetHub");
    expect(metadata.alternates?.canonical).toContain("/tracks/t1");
    const images = metadata.openGraph?.images;
    const image = Array.isArray(images) ? images[0] : images;
    expect(image).toMatchObject({
      width: 1200,
      height: 630,
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(generatedShareImage("A & B", "Track", "track")).toContain("title=A+%26+B");
  });

  it("marks private pages as non-indexable without including the private resource name", () => {
    const metadata = createPrivateMetadata("Private playlist");

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.description).toContain("only available");
    expect(metadata.openGraph?.title).toBe("Private playlist | SangeetHub");
  });
});
