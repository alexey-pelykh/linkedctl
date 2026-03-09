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
  uploadImage,
  uploadVideo,
  uploadDocument,
  SUPPORTED_IMAGE_TYPES,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_SIZE_BYTES,
  loadConfigFile,
  validateConfig,
  getTokenExpiry,
  clearOAuthTokens,
  revokeAccessToken,
} from "@linkedctl/core";
import type { PostContent, PostLifecycleState } from "@linkedctl/core";

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
        "Create a post on LinkedIn with optional media attachment. Supports URNs for pre-uploaded media or local file paths for combined upload+post.",
      inputSchema: {
        text: z.string().describe("The text content of the post"),
        visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional().describe("Post visibility (defaults to PUBLIC)"),
        draft: z.boolean().optional().describe("Save as draft instead of publishing (defaults to false)"),
        image: z.string().optional().describe("Image URN to attach (e.g. urn:li:image:C5608AQ...)"),
        video: z.string().optional().describe("Video URN to attach (e.g. urn:li:video:D5608AQ...)"),
        document: z.string().optional().describe("Document URN to attach (e.g. urn:li:document:D123...)"),
        article_url: z.string().optional().describe("Article URL to attach"),
        images: z.array(z.string()).optional().describe("Array of image URNs for multi-image post (minimum 2)"),
        image_file: z.string().optional().describe("Path to a local image file to upload and attach"),
        video_file: z.string().optional().describe("Path to a local video file to upload and attach"),
        document_file: z.string().optional().describe("Path to a local document file to upload and attach"),
        image_files: z
          .array(z.string())
          .optional()
          .describe("Array of local image file paths to upload and attach (minimum 2)"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      const mediaFlags = [
        args.image,
        args.video,
        args.document,
        args.article_url,
        args.images,
        args.image_file,
        args.video_file,
        args.document_file,
        args.image_files,
      ].filter((v) => v !== undefined);
      if (mediaFlags.length > 1) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Only one media option may be specified: image, video, document, article_url, images, image_file, video_file, document_file, or image_files",
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

      // Handle file-based uploads if no URN-based content was resolved
      if (postContent === undefined) {
        if (args.image_file !== undefined) {
          const ext = extname(args.image_file).toLowerCase();
          const contentType = SUPPORTED_IMAGE_TYPES.get(ext);
          if (contentType === undefined) {
            const supported = [...SUPPORTED_IMAGE_TYPES.keys()].join(", ");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Unsupported image format "${ext}". Supported formats: ${supported}`,
                },
              ],
              isError: true,
            };
          }
          const data = new Uint8Array(await readFile(args.image_file));
          const urn = await uploadImage(client, { owner: authorUrn, data, contentType });
          postContent = { media: { id: urn } };
        } else if (args.video_file !== undefined) {
          const fileStat = await stat(args.video_file);
          if (!fileStat.isFile()) {
            return {
              content: [{ type: "text" as const, text: `Not a file: ${args.video_file}` }],
              isError: true,
            };
          }
          const data = await readFile(args.video_file);
          const urn = await uploadVideo(client, { owner: authorUrn, data });
          postContent = { media: { id: urn } };
        } else if (args.document_file !== undefined) {
          const ext = extname(args.document_file).toLowerCase();
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
          const fileStat = await stat(args.document_file);
          if (fileStat.size > DOCUMENT_MAX_SIZE_BYTES) {
            const sizeMB = Math.round(fileStat.size / (1024 * 1024));
            return {
              content: [{ type: "text" as const, text: `File is ${sizeMB} MB, which exceeds the 100 MB limit.` }],
              isError: true,
            };
          }
          const data = new Uint8Array(await readFile(args.document_file));
          const urn = await uploadDocument(client, { owner: authorUrn, data });
          postContent = { media: { id: urn } };
        } else if (args.image_files !== undefined) {
          if (args.image_files.length < 2) {
            return {
              content: [{ type: "text" as const, text: "Multi-image file posts require at least 2 image file paths" }],
              isError: true,
            };
          }
          const urns: string[] = [];
          for (const filePath of args.image_files) {
            const ext = extname(filePath).toLowerCase();
            const contentType = SUPPORTED_IMAGE_TYPES.get(ext);
            if (contentType === undefined) {
              const supported = [...SUPPORTED_IMAGE_TYPES.keys()].join(", ");
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Unsupported image format "${ext}" for file "${filePath}". Supported formats: ${supported}`,
                  },
                ],
                isError: true,
              };
            }
            const data = new Uint8Array(await readFile(filePath));
            const urn = await uploadImage(client, { owner: authorUrn, data, contentType });
            urns.push(urn);
          }
          postContent = { multiImage: { images: urns.map((id) => ({ id })) } };
        }
      }

      const visibility = args.visibility ?? "PUBLIC";
      const lifecycleState: PostLifecycleState = args.draft === true ? "DRAFT" : "PUBLISHED";

      const postUrn = await createPost(client, {
        author: authorUrn,
        text: args.text,
        visibility,
        content: postContent,
        lifecycleState,
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
