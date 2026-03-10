// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerAuthTools } from "./tools/auth.js";
import { registerPostTools } from "./tools/posts.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerReactionTools } from "./tools/reactions.js";
import { registerOrgTools } from "./tools/orgs.js";
import { registerStatsTools } from "./tools/stats.js";
import { registerMediaTools } from "./tools/media.js";

/**
 * Create and configure the LinkedCtl MCP server with all tools registered.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "linkedctl",
    version: "0.0.0",
  });

  registerAuthTools(server);
  registerPostTools(server);
  registerCommentTools(server);
  registerReactionTools(server);
  registerOrgTools(server);
  registerStatsTools(server);
  registerMediaTools(server);

  return server;
}
