// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  getOrganization,
  uploadDocument,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_SIZE_BYTES,
} from "@linkedctl/core";

export function registerMediaTools(server: McpServer): void {
  server.registerTool(
    "document_upload",
    {
      title: "Upload Document",
      description: "Upload a document to LinkedIn (PDF, DOCX, PPTX, DOC, PPT; max 100 MB). Returns the document URN.",
      inputSchema: {
        file: z.string().describe("Absolute path to the document file"),
        as_org: z.string().optional().describe("Organization ID to upload as (e.g. 12345)"),
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

      let ownerUrn: string;
      if (args.as_org !== undefined) {
        await getOrganization(client, args.as_org);
        ownerUrn = `urn:li:organization:${args.as_org}`;
      } else {
        ownerUrn = await getCurrentPersonUrn(client);
      }
      const data = new Uint8Array(await readFile(args.file));

      const documentUrn = await uploadDocument(client, { owner: ownerUrn, data });

      return {
        content: [{ type: "text" as const, text: `Document uploaded: ${documentUrn}` }],
      };
    },
  );
}
