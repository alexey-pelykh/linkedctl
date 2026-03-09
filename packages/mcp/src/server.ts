// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

import {
  resolveConfig,
  LinkedInClient,
  LinkedInAuthError,
  getCurrentPersonUrn,
  getUserInfo,
  createPost,
  uploadDocument,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_SIZE_BYTES,
  loadConfigFile,
  validateConfig,
  getTokenExpiry,
  clearOAuthTokens,
  revokeAccessToken,
} from "@linkedctl/core";
import type { PostContent } from "@linkedctl/core";

/**
 * Create and configure the LinkedCtl MCP server with all tools registered.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "linkedctl",
    version: "0.0.0",
  });

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
      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      let userInfo;
      try {
        userInfo = await getUserInfo(client);
      } catch (error: unknown) {
        if (error instanceof LinkedInAuthError) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Authentication failed: ${error.message}\nRun "linkedctl auth login" to re-authenticate.`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }

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

  server.registerTool(
    "post_create",
    {
      title: "Create Post",
      description:
        "Create a post on LinkedIn with optional media attachment (image, video, document, article URL, or multi-image)",
      inputSchema: {
        text: z.string().describe("The text content of the post"),
        visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional().describe("Post visibility (defaults to PUBLIC)"),
        image: z.string().optional().describe("Image URN to attach (e.g. urn:li:image:C5608AQ...)"),
        video: z.string().optional().describe("Video URN to attach (e.g. urn:li:video:D5608AQ...)"),
        document: z.string().optional().describe("Document URN to attach (e.g. urn:li:document:D123...)"),
        article_url: z.string().optional().describe("Article URL to attach"),
        images: z.array(z.string()).optional().describe("Array of image URNs for multi-image post (minimum 2)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const mediaFlags = [args.image, args.video, args.document, args.article_url, args.images].filter(
        (v) => v !== undefined,
      );
      if (mediaFlags.length > 1) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Only one media option may be specified: image, video, document, article_url, or images",
            },
          ],
          isError: true,
        };
      }

      let postContent: PostContent | undefined;
      if (args.image !== undefined) {
        postContent = { media: { id: args.image } };
      } else if (args.video !== undefined) {
        postContent = { media: { id: args.video } };
      } else if (args.document !== undefined) {
        postContent = { media: { id: args.document } };
      } else if (args.article_url !== undefined) {
        postContent = { article: { source: args.article_url } };
      } else if (args.images !== undefined) {
        if (args.images.length < 2) {
          return {
            content: [{ type: "text" as const, text: "Multi-image posts require at least 2 image URNs" }],
            isError: true,
          };
        }
        postContent = { multiImage: { images: args.images.map((id) => ({ id })) } };
      }

      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      // resolveConfig guarantees oauth.accessToken and apiVersion are defined
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const authorUrn = await getCurrentPersonUrn(client);
      const visibility = args.visibility ?? "PUBLIC";

      const postUrn = await createPost(client, {
        author: authorUrn,
        text: args.text,
        visibility,
        content: postContent,
      });

      return {
        content: [{ type: "text" as const, text: `Post created: ${postUrn}` }],
      };
    },
  );

  server.registerTool(
    "document_upload",
    {
      title: "Upload Document",
      description: "Upload a document to LinkedIn (PDF, DOCX, PPTX, DOC, PPT; max 100 MB). Returns the document URN.",
      inputSchema: {
        file: z.string().describe("Absolute path to the document file"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const ext = extname(args.file).toLowerCase();
      if (!DOCUMENT_EXTENSIONS.includes(ext as (typeof DOCUMENT_EXTENSIONS)[number])) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Unsupported file type "${ext}". Supported types: ${DOCUMENT_EXTENSIONS.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const fileStat = await stat(args.file);
      if (fileStat.size > DOCUMENT_MAX_SIZE_BYTES) {
        const sizeMB = Math.round(fileStat.size / (1024 * 1024));
        return {
          content: [{ type: "text" as const, text: `File is ${sizeMB} MB, which exceeds the 100 MB limit.` }],
          isError: true,
        };
      }

      const { config } = await resolveConfig({
        profile: args.profile,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const ownerUrn = await getCurrentPersonUrn(client);
      const data = new Uint8Array(await readFile(args.file));

      const documentUrn = await uploadDocument(client, { owner: ownerUrn, data });

      return {
        content: [{ type: "text" as const, text: `Document uploaded: ${documentUrn}` }],
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

  return server;
}
