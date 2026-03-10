// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { PostContent, PostData, PostLifecycleState, PostListResponse, PostVisibility } from "./types.js";

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
  /** Post lifecycle state. Defaults to `"PUBLISHED"`. */
  lifecycleState?: PostLifecycleState | undefined;
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
  /** Post lifecycle state. Defaults to `"PUBLISHED"`. */
  lifecycleState?: PostLifecycleState | undefined;
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
    lifecycleState: options.lifecycleState ?? "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (options.content !== undefined) {
    body.content = options.content;
  }

  return client.create("/rest/posts", body);
}

/**
 * URL-encode a URN for use in REST.li resource paths.
 */
function encodeUrn(urn: string): string {
  return encodeURIComponent(urn);
}

/**
 * Options for listing posts by author.
 */
export interface ListPostsOptions {
  /** Author URN (e.g. `urn:li:person:abc123`). */
  author: string;
  /** Number of posts to return (default 10, max 100). */
  count?: number | undefined;
  /** Starting index for pagination (default 0). */
  start?: number | undefined;
}

/**
 * Options for updating a post.
 */
export interface UpdatePostOptions {
  /** New post text content. */
  text: string;
}

/**
 * Fetch a single LinkedIn post by URN.
 */
export async function getPost(client: LinkedInClient, postUrn: string): Promise<PostData> {
  return client.request<PostData>(`/rest/posts/${encodeUrn(postUrn)}`);
}

/**
 * List posts by author with pagination.
 */
export async function listPosts(client: LinkedInClient, options: ListPostsOptions): Promise<PostListResponse> {
  const count = options.count ?? 10;
  const start = options.start ?? 0;
  const author = encodeURIComponent(options.author);
  return client.request<PostListResponse>(
    `/rest/posts?q=author&author=${author}&count=${String(count)}&start=${String(start)}`,
  );
}

/**
 * Update the commentary text of an existing LinkedIn post.
 */
export async function updatePost(client: LinkedInClient, postUrn: string, options: UpdatePostOptions): Promise<void> {
  await client.requestVoid(`/rest/posts/${encodeUrn(postUrn)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RestLi-Method": "PARTIAL_UPDATE",
    },
    body: JSON.stringify({
      patch: {
        $set: {
          commentary: options.text,
        },
      },
    }),
  });
}

/**
 * Delete a LinkedIn post by URN.
 */
export async function deletePost(client: LinkedInClient, postUrn: string): Promise<void> {
  await client.requestVoid(`/rest/posts/${encodeUrn(postUrn)}`, {
    method: "DELETE",
  });
}
