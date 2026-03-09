// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Supported LinkedIn reaction types.
 */
export type ReactionType = "LIKE" | "PRAISE" | "EMPATHY" | "INTEREST" | "APPRECIATION" | "ENTERTAINMENT";

/**
 * All valid reaction type values.
 */
export const REACTION_TYPES: readonly ReactionType[] = [
  "LIKE",
  "PRAISE",
  "EMPATHY",
  "INTEREST",
  "APPRECIATION",
  "ENTERTAINMENT",
] as const;

/**
 * A reaction on a LinkedIn entity.
 */
export interface Reaction {
  /** The person who reacted. */
  actor: string;
  /** The entity that was reacted to. */
  entity: string;
  /** The type of reaction. */
  reactionType: ReactionType;
  /** Timestamp when the reaction was created (milliseconds since epoch). */
  createdAt: number;
}

/**
 * Options for creating a reaction.
 */
export interface CreateReactionOptions {
  /** The entity URN to react to (e.g. `urn:li:share:abc123`). */
  entity: string;
  /** The type of reaction. Defaults to `"LIKE"`. */
  reactionType?: ReactionType | undefined;
}

/**
 * Options for listing reactions on an entity.
 */
export interface ListReactionsOptions {
  /** The entity URN to list reactions for. */
  entity: string;
  /** Number of results to return. */
  count?: number | undefined;
  /** Starting index for pagination. */
  start?: number | undefined;
}

/**
 * Options for deleting a reaction.
 */
export interface DeleteReactionOptions {
  /** The entity URN the reaction is on. */
  entity: string;
  /** The actor URN whose reaction to delete. */
  actor: string;
}
