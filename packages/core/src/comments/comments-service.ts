// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { Comment } from "./types.js";

/**
 * Options for creating a comment on a LinkedIn post.
 */
export interface CreateCommentOptions {
  /** Author URN (e.g. `urn:li:person:abc123`). */
  actor: string;
  /** Parent entity URN to comment on (e.g. `urn:li:share:...` or `urn:li:ugcPost:...`). */
  object: string;
  /** Comment text. */
  message: string;
}

/**
 * Options for listing comments on a LinkedIn post.
 */
export interface ListCommentsOptions {
  /** Parent entity URN (e.g. `urn:li:share:...`). */
  object: string;
}

/**
 * Options for getting a specific comment.
 */
export interface GetCommentOptions {
  /** Comment URN (e.g. `urn:li:comment:(urn:li:activity:123,456)`). */
  commentUrn: string;
}

/**
 * Options for deleting a comment.
 */
export interface DeleteCommentOptions {
  /** Comment URN (e.g. `urn:li:comment:(urn:li:activity:123,456)`). */
  commentUrn: string;
}

interface CommentsApiResponse {
  elements: Array<{
    actor: string;
    object: string;
    message: { text: string };
    $URN: string;
    created: { time: number };
  }>;
}

interface CommentApiResponse {
  actor: string;
  object: string;
  message: { text: string };
  $URN: string;
  created: { time: number };
}

/**
 * Create a comment on a LinkedIn post and return the comment URN.
 */
export async function createComment(client: LinkedInClient, options: CreateCommentOptions): Promise<string> {
  return client.create("/rest/comments", {
    actor: options.actor,
    object: options.object,
    message: { text: options.message },
  });
}

/**
 * List comments on a LinkedIn post.
 */
export async function listComments(client: LinkedInClient, options: ListCommentsOptions): Promise<Comment[]> {
  const encodedUrn = encodeURIComponent(options.object);
  const response = await client.request<CommentsApiResponse>(`/rest/comments?q=comments&article=${encodedUrn}`);
  return response.elements.map(mapComment);
}

/**
 * Get a specific comment by URN.
 */
export async function getComment(client: LinkedInClient, options: GetCommentOptions): Promise<Comment> {
  const encodedUrn = encodeURIComponent(options.commentUrn);
  const response = await client.request<CommentApiResponse>(`/rest/comments/${encodedUrn}`);
  return mapComment(response);
}

/**
 * Delete a comment by URN.
 */
export async function deleteComment(client: LinkedInClient, options: DeleteCommentOptions): Promise<void> {
  const encodedUrn = encodeURIComponent(options.commentUrn);
  await client.request<undefined>(`/rest/comments/${encodedUrn}`, { method: "DELETE" });
}

function mapComment(raw: CommentApiResponse): Comment {
  return {
    urn: raw.$URN,
    actor: raw.actor,
    object: raw.object,
    message: raw.message.text,
    createdAt: new Date(raw.created.time).toISOString(),
  };
}
