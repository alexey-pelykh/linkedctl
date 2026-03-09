// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Supported visibility settings for a LinkedIn post.
 */
export type PostVisibility = "PUBLIC" | "CONNECTIONS";

/**
 * Lifecycle state of a LinkedIn post.
 */
export type PostLifecycleState = "PUBLISHED" | "DRAFT";

/**
 * A single media attachment (image, video, or document).
 */
export interface MediaContent {
  /** Media asset URN (e.g. `urn:li:image:...`, `urn:li:video:...`, `urn:li:document:...`). */
  id: string;
}

/**
 * An article link attachment.
 */
export interface ArticleContent {
  /** The article URL. */
  source: string;
  /** Optional article title. */
  title?: string | undefined;
  /** Optional article description. */
  description?: string | undefined;
}

/**
 * A multi-image attachment.
 */
export interface MultiImageContent {
  /** Array of image URNs (minimum 2). */
  images: Array<{ id: string }>;
}

/**
 * Content attachment for a LinkedIn post.
 */
export type PostContent = { media: MediaContent } | { article: ArticleContent } | { multiImage: MultiImageContent };
