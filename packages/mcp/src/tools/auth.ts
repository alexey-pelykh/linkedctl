// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  getUserInfo,
  loadConfigFile,
  validateConfig,
  getTokenExpiry,
  clearOAuthTokens,
  revokeAccessToken,
} from "@linkedctl/core";

import { withClient } from "./with-client.js";

export function registerAuthTools(server: McpServer): void {
  server.registerTool(
    "whoami",
    {
      title: "Who Am I",
      description: "Show the current LinkedIn user's name, email, and profile picture URL",
      inputSchema: {
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["openid", "profile", "email"],
        },
        async (client) => {
          const userInfo = await getUserInfo(client);

          return {
            content: [
              {
                type: "text" as const,
                text: `Name: ${userInfo.name}\nEmail: ${userInfo.email}\nPicture: ${userInfo.picture}`,
              },
            ],
          };
        },
      );
    },
  );

  server.registerTool(
    "auth_status",
    {
      title: "Auth Status",
      description: "Show authentication status for a profile",
      inputSchema: {
        profile: z.string().optional().describe("Profile name to check (uses default if not specified)"),
      },
    },
    async (args) => {
      const { raw } = await loadConfigFile({ profile: args.profile });
      const { config } = validateConfig(raw);
      const label = args.profile ?? "default";

      if (config.oauth?.accessToken === undefined || config.oauth.accessToken === "") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile: ${label}\nStatus: not configured\nConfigure OAuth credentials in your LinkedCtl config file to set up authentication.`,
            },
          ],
        };
      }

      const expiry = getTokenExpiry(config.oauth.accessToken);

      if (expiry === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile: ${label}\nStatus: authenticated\nExpiry: unknown (token is not a JWT)`,
            },
          ],
        };
      }

      if (expiry.isExpired) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile: ${label}\nStatus: expired\nExpired: ${expiry.expiresAt.toISOString()}\nConfigure OAuth credentials in your LinkedCtl config file to re-authenticate.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Profile: ${label}\nStatus: authenticated\nExpires: ${expiry.expiresAt.toISOString()}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "auth_revoke",
    {
      title: "Revoke Auth Token",
      description: "Revoke the access token server-side and clear local credentials for a profile",
      inputSchema: {
        profile: z.string().optional().describe("Profile name to revoke (uses default if not specified)"),
      },
    },
    async (args) => {
      const { raw } = await loadConfigFile({ profile: args.profile });
      const { config } = validateConfig(raw);
      const label = args.profile ?? "default";

      if (config.oauth === undefined) {
        return {
          content: [{ type: "text" as const, text: `Profile "${label}" not found or has no OAuth config.` }],
          isError: true,
        };
      }

      const accessToken = config.oauth.accessToken;
      const clientId = config.oauth.clientId;
      const clientSecret = config.oauth.clientSecret;

      if (accessToken === undefined || accessToken === "" || clientId === undefined || clientSecret === undefined) {
        await clearOAuthTokens({ profile: args.profile });
        return {
          content: [
            {
              type: "text" as const,
              text: `No complete credentials for server-side revocation. Local credentials cleared for profile "${label}".`,
            },
          ],
        };
      }

      let serverRevoked = true;
      let warning = "";
      try {
        await revokeAccessToken(clientId, clientSecret, accessToken);
      } catch (error: unknown) {
        serverRevoked = false;
        warning = error instanceof Error ? error.message : String(error);
      }

      await clearOAuthTokens({ profile: args.profile });

      const lines: string[] = [];
      if (serverRevoked) {
        lines.push(`Access token revoked server-side for profile "${label}".`);
      } else {
        lines.push(`Warning: Server-side revocation failed: ${warning}`);
      }
      lines.push(`Local credentials cleared for profile "${label}".`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );
}
