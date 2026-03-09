// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { PostContent, PostVisibility } from "./types.js";

/**
 * Options for creating a text-only LinkedIn post.
 */
export interface CreateTextPostOptions {
  /** Author URN (e.g. `urn:li:person:abc123`). */
  author: string;
  /** The post text content. */
  text: string;
  /** Post visibility. Defaults to `"PUBLIC"`. */
  visibility?: PostVisibility | undefined;
}

/**
 * Options for creating a LinkedIn post with optional media content.
 */
export interface CreatePostOptions {
  /** Author URN (e.g. `urn:li:person:abc123`). */
  author: string;
  /** The post text content. */
  text: string;
  /** Post visibility. Defaults to `"PUBLIC"`. */
  visibility?: PostVisibility | undefined;
  /** Optional media content attachment. */
  content?: PostContent | undefined;
}

/**
 * Create a text-only post on LinkedIn and return the post URN.
 */
export async function createTextPost(client: LinkedInClient, options: CreateTextPostOptions): Promise<string> {
  return createPost(client, options);
}

/**
 * Create a post on LinkedIn with optional media content and return the post URN.
 */
export async function createPost(client: LinkedInClient, options: CreatePostOptions): Promise<string> {
  const body: Record<string, unknown> = {
    author: options.author,
    commentary: options.text,
    visibility: options.visibility ?? "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (options.content !== undefined) {
    body.content = options.content;
  }

  return client.create("/rest/posts", body);
}
