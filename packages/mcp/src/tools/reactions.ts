// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getCurrentPersonUrn, createReaction, listReactions, deleteReaction, REACTION_TYPES } from "@linkedctl/core";
import type { ReactionType } from "@linkedctl/core";

import { withClient } from "./with-client.js";

export function registerReactionTools(server: McpServer): void {
  server.registerTool(
    "reaction_create",
    {
      title: "Create Reaction",
      description:
        "Add a reaction to a LinkedIn post. Supports LIKE (default), PRAISE, EMPATHY, INTEREST, APPRECIATION, ENTERTAINMENT. Use as_org to react as an organization.",
      inputSchema: {
        entity_urn: z.string().describe("Entity URN to react to (e.g. urn:li:share:abc123)"),
        reaction_type: z
          .enum(REACTION_TYPES as unknown as [string, ...string[]])
          .optional()
          .describe("Type of reaction (defaults to LIKE)"),
        as_org: z.string().optional().describe("Organization ID to act as (numeric, e.g. 12345)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["openid", "profile", "email", "w_member_social"],
        },
        async (client) => {
          const actor = args.as_org !== undefined ? `urn:li:organization:${args.as_org}` : undefined;
          const reactionUrn = await createReaction(client, {
            entity: args.entity_urn,
            reactionType: (args.reaction_type as ReactionType | undefined) ?? "LIKE",
            actor,
          });

          return {
            content: [{ type: "text" as const, text: `Reaction created: ${reactionUrn}` }],
          };
        },
      );
    },
  );

  server.registerTool(
    "reaction_list",
    {
      title: "List Reactions",
      description: "List reactions on a LinkedIn post",
      inputSchema: {
        entity_urn: z.string().describe("Entity URN to list reactions for (e.g. urn:li:share:abc123)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["openid", "profile", "email", "w_member_social"],
        },
        async (client) => {
          const reactions = await listReactions(client, { entity: args.entity_urn });

          if (reactions.length === 0) {
            return {
              content: [{ type: "text" as const, text: "No reactions found" }],
            };
          }

          const lines = reactions.map(
            (r) => `${r.reactionType} by ${r.actor} at ${new Date(r.createdAt).toISOString()}`,
          );
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        },
      );
    },
  );

  server.registerTool(
    "reaction_delete",
    {
      title: "Delete Reaction",
      description: "Remove a reaction from a LinkedIn post. Use as_org to delete an organization's reaction.",
      inputSchema: {
        entity_urn: z.string().describe("Entity URN to remove reaction from (e.g. urn:li:share:abc123)"),
        as_org: z.string().optional().describe("Organization ID to act as (numeric, e.g. 12345)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["openid", "profile", "email", "w_member_social"],
        },
        async (client) => {
          const actorUrn =
            args.as_org !== undefined ? `urn:li:organization:${args.as_org}` : await getCurrentPersonUrn(client);

          await deleteReaction(client, { entity: args.entity_urn, actor: actorUrn });

          return {
            content: [{ type: "text" as const, text: "Reaction deleted" }],
          };
        },
      );
    },
  );
}
