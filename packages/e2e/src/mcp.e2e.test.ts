// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasCredentials, cliEnv } from "./credentials.js";

const MCP_BIN = resolve(dirname(fileURLToPath(import.meta.url)), "../../mcp/dist/index.js");

describe.skipIf(!hasCredentials())("MCP E2E", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [MCP_BIN],
      env: { ...process.env, ...cliEnv() },
    });
    client = new Client({ name: "e2e-test", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("lists available tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain("post_create");
    expect(names).toContain("auth_status");
  });

  describe("post_create", () => {
    it("creates a text post and returns the URN", async () => {
      const text = `[E2E test] linkedctl MCP ${new Date().toISOString()}`;
      const result = await client.callTool({
        name: "post_create",
        arguments: { text, visibility: "CONNECTIONS" },
      });

      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);

      const content = result.content[0];
      expect(content).toHaveProperty("type", "text");
      expect(content).toHaveProperty("text");
      expect((content as { text: string }).text).toMatch(/^Post created: urn:li:share:\d+$/);
    });
  });

  describe("auth_status", () => {
    it("returns authentication status", async () => {
      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);

      const content = result.content[0];
      expect(content).toHaveProperty("type", "text");
      expect((content as { text: string }).text).toContain("Profile:");
      expect((content as { text: string }).text).toContain("Status:");
    });
  });
});
