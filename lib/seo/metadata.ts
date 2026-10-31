import type { Metadata } from "next";

export type ShareEntityKind = "track" | "album" | "artist" | "playlist" | "profile" | "party";

const FALLBACK_SITE_URL = "http://localhost:3000";

function getSiteUrl() {
  const configured = process.env.NEXTAUTH_URL;
  if (!configured) return new URL(FALLBACK_SITE_URL);

  try {
    return new URL(configured);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export function absoluteSiteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function generatedShareImage(title: string, subtitle: string, kind: ShareEntityKind) {
  const query = new URLSearchParams({ title, subtitle, kind });
  return absoluteSiteUrl(`/api/og?${query.toString()}`);
}

export function createShareMetadata({
  title,
  description,
  path,
  kind,
}: {
  title: string;
  description: string;
  path: string;
  kind: ShareEntityKind;
}): Metadata {
  const image = generatedShareImage(title, description, kind);
  const url = absoluteSiteUrl(path);

  return {
    title: `${title} | SangeetHub`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "SangeetHub",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: `${title} preview` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function createPrivateMetadata(label: string): Metadata {
  const title = `${label} | SangeetHub`;
  const description = "This SangeetHub page is only available to invited or signed-in listeners.";
  const image = generatedShareImage("Private listening space", "Sign in to continue on SangeetHub", "party");

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: "SangeetHub",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "Private SangeetHub page" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
