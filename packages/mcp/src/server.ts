// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  createTextPost,
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  getProfile,
  getTokenExpiry,
  clearProfileCredentials,
  revokeAccessToken,
} from "@linkedctl/core";

/**
 * Create and configure the LinkedCtl MCP server with all tools registered.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "linkedctl",
    version: "0.0.0",
  });

  server.registerTool(
    "post_create",
    {
      title: "Create Post",
      description: "Create a text post on LinkedIn",
      inputSchema: {
        text: z.string().describe("The text content of the post"),
        visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional().describe("Post visibility (defaults to PUBLIC)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const config = await resolveConfig({ profile: args.profile });
      const client = new LinkedInClient({
        accessToken: config.accessToken,
        apiVersion: config.apiVersion,
      });

      const authorUrn = await getCurrentPersonUrn(client);
      const visibility = args.visibility ?? "PUBLIC";

      const postUrn = await createTextPost(client, {
        author: authorUrn,
        text: args.text,
        visibility,
      });

      return {
        content: [{ type: "text" as const, text: `Post created: ${postUrn}` }],
      };
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
      const configPath = getDefaultConfigPath();
      const config = await readConfigFile(configPath);

      const profileName = args.profile ?? config["default-profile"] ?? "default";
      const profile = getProfile(config, profileName);

      if (profile === undefined || profile["access-token"] === "") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile: ${profileName}\nStatus: not configured\nRun "linkedctl profile create" to set up authentication.`,
            },
          ],
        };
      }

      const expiry = getTokenExpiry(profile["access-token"]);

      if (expiry === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile: ${profileName}\nStatus: authenticated\nExpiry: unknown (token is not a JWT)`,
            },
          ],
        };
      }

      if (expiry.isExpired) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile: ${profileName}\nStatus: expired\nExpired: ${expiry.expiresAt.toISOString()}\nRun "linkedctl profile create" with a new --access-token to re-authenticate.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Profile: ${profileName}\nStatus: authenticated\nExpires: ${expiry.expiresAt.toISOString()}`,
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
      const configPath = getDefaultConfigPath();
      const config = await readConfigFile(configPath);

      const profileName = args.profile ?? config["default-profile"] ?? "default";
      const profile = getProfile(config, profileName);

      if (profile === undefined) {
        return {
          content: [{ type: "text" as const, text: `Profile "${profileName}" not found.` }],
          isError: true,
        };
      }

      const accessToken = profile["access-token"];
      const clientId = profile["client-id"];
      const clientSecret = profile["client-secret"];

      if (accessToken === "" || clientId === undefined || clientSecret === undefined) {
        const updated = clearProfileCredentials(config, profileName);
        await writeConfigFile(configPath, updated);
        return {
          content: [
            {
              type: "text" as const,
              text: `No complete credentials for server-side revocation. Local credentials cleared for profile "${profileName}".`,
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

      const updated = clearProfileCredentials(config, profileName);
      await writeConfigFile(configPath, updated);

      const lines: string[] = [];
      if (serverRevoked) {
        lines.push(`Access token revoked server-side for profile "${profileName}".`);
      } else {
        lines.push(`Warning: Server-side revocation failed: ${warning}`);
      }
      lines.push(`Local credentials cleared for profile "${profileName}".`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );

  return server;
}
