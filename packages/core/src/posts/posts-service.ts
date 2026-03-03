// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { PostVisibility } from "./types.js";

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
 * Create a text-only post on LinkedIn and return the post URN.
 */
export async function createTextPost(client: LinkedInClient, options: CreateTextPostOptions): Promise<string> {
  const body = {
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

  return client.create("/rest/posts", body);
}
