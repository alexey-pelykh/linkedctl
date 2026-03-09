// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type {
  CreateReactionOptions,
  DeleteReactionOptions,
  ListReactionsOptions,
  Reaction,
  ReactionType,
} from "./types.js";

interface ReactionsResponse {
  elements: Array<{
    actor: string;
    object: string;
    reactionType: ReactionType;
    created: { time: number };
  }>;
}

/**
 * Encode a URN for use inside a REST.li compound key by percent-encoding colons.
 */
function encodeUrnForKey(urn: string): string {
  return urn.replaceAll(":", "%3A");
}

/**
 * Create a reaction on a LinkedIn entity.
 */
export async function createReaction(client: LinkedInClient, options: CreateReactionOptions): Promise<string> {
  const body = {
    root: options.entity,
    reactionType: options.reactionType ?? "LIKE",
  };

  return client.create("/rest/reactions", body);
}

/**
 * List reactions on a LinkedIn entity.
 */
export async function listReactions(client: LinkedInClient, options: ListReactionsOptions): Promise<Reaction[]> {
  const params = new URLSearchParams({ q: "entity", entity: options.entity });
  if (options.count !== undefined) {
    params.set("count", String(options.count));
  }
  if (options.start !== undefined) {
    params.set("start", String(options.start));
  }

  const response = await client.request<ReactionsResponse>(`/rest/reactions?${params.toString()}`);
  return response.elements.map((element) => ({
    actor: element.actor,
    entity: element.object,
    reactionType: element.reactionType,
    createdAt: element.created.time,
  }));
}

/**
 * Delete a reaction from a LinkedIn entity.
 */
export async function deleteReaction(client: LinkedInClient, options: DeleteReactionOptions): Promise<void> {
  const actorKey = encodeUrnForKey(options.actor);
  const entityKey = encodeUrnForKey(options.entity);
  const path = `/rest/reactions/(actor:${actorKey},entity:${entityKey})`;

  await client.delete(path);
}
