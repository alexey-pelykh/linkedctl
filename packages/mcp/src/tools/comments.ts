// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  createComment,
  listComments,
  getComment,
  deleteComment,
} from "@linkedctl/core";

export function registerCommentTools(server: McpServer): void {
  server.registerTool(
    "comment_create",
    {
      title: "Create Comment",
      description: "Create a comment on a LinkedIn post. Use as_org to comment as an organization.",
      inputSchema: {
        post_urn: z.string().describe("Post URN to comment on (e.g. urn:li:share:...)"),
        text: z.string().describe("The comment text"),
        as_org: z.string().optional().describe("Organization ID to act as (numeric, e.g. 12345)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const actorUrn =
        args.as_org !== undefined ? `urn:li:organization:${args.as_org}` : await getCurrentPersonUrn(client);

      const commentUrn = await createComment(client, {
        actor: actorUrn,
        object: args.post_urn,
        message: args.text,
      });

      return {
        content: [{ type: "text" as const, text: `Comment created: ${commentUrn}` }],
      };
    },
  );

  server.registerTool(
    "comment_list",
    {
      title: "List Comments",
      description: "List comments on a LinkedIn post",
      inputSchema: {
        post_urn: z.string().describe("Post URN to list comments for (e.g. urn:li:share:...)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const comments = await listComments(client, { object: args.post_urn });

      if (comments.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No comments found." }],
        };
      }

      const lines = comments.map(
        (c) => `URN: ${c.urn}\nActor: ${c.actor}\nMessage: ${c.message}\nCreated: ${c.createdAt}`,
      );

      return {
        content: [{ type: "text" as const, text: lines.join("\n\n") }],
      };
    },
  );

  server.registerTool(
    "comment_get",
    {
      title: "Get Comment",
      description: "Get a specific comment by URN",
      inputSchema: {
        comment_urn: z.string().describe("Comment URN (e.g. urn:li:comment:(urn:li:activity:123,456))"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const comment = await getComment(client, { commentUrn: args.comment_urn });

      return {
        content: [
          {
            type: "text" as const,
            text: `URN: ${comment.urn}\nActor: ${comment.actor}\nObject: ${comment.object}\nMessage: ${comment.message}\nCreated: ${comment.createdAt}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "comment_delete",
    {
      title: "Delete Comment",
      description: "Delete a comment by URN",
      inputSchema: {
        comment_urn: z.string().describe("Comment URN to delete (e.g. urn:li:comment:(urn:li:activity:123,456))"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      await deleteComment(client, { commentUrn: args.comment_urn });

      return {
        content: [{ type: "text" as const, text: "Comment deleted." }],
      };
    },
  );
}
