// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { listOrganizations, getOrganization, getOrganizationFollowerCount } from "@linkedctl/core";

import { withClient } from "./with-client.js";

export function registerOrgTools(server: McpServer): void {
  server.registerTool(
    "org_list",
    {
      title: "List Organizations",
      description: "List LinkedIn organizations the authenticated user administers",
      inputSchema: {
        count: z.number().optional().describe("Number of results to return (default 10, max 100)"),
        start: z.number().optional().describe("Starting index for pagination (default 0)"),
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
          const response = await listOrganizations(client, {
            count: args.count,
            start: args.start,
          });

          return {
            content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
          };
        },
      );
    },
  );

  server.registerTool(
    "org_get",
    {
      title: "Get Organization",
      description: "Fetch a single LinkedIn organization by ID",
      inputSchema: {
        id: z.string().describe("Organization ID (numeric, e.g. 12345)"),
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
          const org = await getOrganization(client, args.id);

          return {
            content: [{ type: "text" as const, text: JSON.stringify(org, null, 2) }],
          };
        },
      );
    },
  );

  server.registerTool(
    "org_followers",
    {
      title: "Get Organization Followers",
      description: "Get the follower count for a LinkedIn organization",
      inputSchema: {
        id: z.string().describe("Organization ID (numeric, e.g. 12345)"),
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
          const organizationUrn = `urn:li:organization:${args.id}`;
          const followerCount = await getOrganizationFollowerCount(client, organizationUrn);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ organization: organizationUrn, followerCount }, null, 2),
              },
            ],
          };
        },
      );
    },
  );
}
