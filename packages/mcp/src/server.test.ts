// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server.js";

vi.mock("@linkedctl/core", () => ({
  resolveConfig: vi.fn(),
  LinkedInClient: vi.fn(),
  getCurrentPersonUrn: vi.fn(),
  createTextPost: vi.fn(),
  getDefaultConfigPath: vi.fn(),
  readConfigFile: vi.fn(),
  getProfile: vi.fn(),
  getTokenExpiry: vi.fn(),
}));

import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  createTextPost,
  getDefaultConfigPath,
  readConfigFile,
  getProfile,
  getTokenExpiry,
} from "@linkedctl/core";

describe("createMcpServer", () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const server = createMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    cleanup = async () => {
      await client.close();
      await server.close();
    };
  });

  afterEach(async () => {
    await cleanup();
  });

  it("lists post_create and auth_status tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain("post_create");
    expect(toolNames).toContain("auth_status");
  });

  describe("post_create", () => {
    it("creates a post and returns the URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        accessToken: "test-token",
        apiVersion: "202401",
        profile: "default",
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createTextPost).mockResolvedValue("urn:li:share:post456");

      const result = await client.callTool({
        name: "post_create",
        arguments: { text: "Hello LinkedIn" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({ profile: undefined });
      expect(createTextPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          author: "urn:li:person:abc123",
          text: "Hello LinkedIn",
          visibility: "PUBLIC",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:post456" }]);
    });

    it("passes profile and visibility options", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        accessToken: "test-token",
        apiVersion: "202401",
        profile: "work",
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createTextPost).mockResolvedValue("urn:li:share:post789");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Connections only",
          visibility: "CONNECTIONS",
          profile: "work",
        },
      });

      expect(resolveConfig).toHaveBeenCalledWith({ profile: "work" });
      expect(createTextPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          visibility: "CONNECTIONS",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:post789" }]);
    });
  });

  describe("auth_status", () => {
    it("reports not configured when profile has no token", async () => {
      vi.mocked(getDefaultConfigPath).mockReturnValue("/home/user/.linkedctl.yaml");
      vi.mocked(readConfigFile).mockResolvedValue({ "default-profile": "default" });
      vi.mocked(getProfile).mockReturnValue(undefined);

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: not configured"),
        },
      ]);
    });

    it("reports authenticated with expiry for valid JWT", async () => {
      vi.mocked(getDefaultConfigPath).mockReturnValue("/home/user/.linkedctl.yaml");
      vi.mocked(readConfigFile).mockResolvedValue({ "default-profile": "default" });
      vi.mocked(getProfile).mockReturnValue({
        "access-token": "valid-jwt-token",
        "api-version": "202401",
      });
      vi.mocked(getTokenExpiry).mockReturnValue({
        expiresAt: new Date("2099-12-31T23:59:59Z"),
        isExpired: false,
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: authenticated"),
        },
      ]);
    });

    it("reports expired for expired token", async () => {
      vi.mocked(getDefaultConfigPath).mockReturnValue("/home/user/.linkedctl.yaml");
      vi.mocked(readConfigFile).mockResolvedValue({ "default-profile": "default" });
      vi.mocked(getProfile).mockReturnValue({
        "access-token": "expired-jwt-token",
        "api-version": "202401",
      });
      vi.mocked(getTokenExpiry).mockReturnValue({
        expiresAt: new Date("2020-01-01T00:00:00Z"),
        isExpired: true,
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: expired"),
        },
      ]);
    });

    it("reports unknown expiry for non-JWT token", async () => {
      vi.mocked(getDefaultConfigPath).mockReturnValue("/home/user/.linkedctl.yaml");
      vi.mocked(readConfigFile).mockResolvedValue({ "default-profile": "default" });
      vi.mocked(getProfile).mockReturnValue({
        "access-token": "opaque-token",
        "api-version": "202401",
      });
      vi.mocked(getTokenExpiry).mockReturnValue(undefined);

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("unknown (token is not a JWT)"),
        },
      ]);
    });

    it("uses specified profile name", async () => {
      vi.mocked(getDefaultConfigPath).mockReturnValue("/home/user/.linkedctl.yaml");
      vi.mocked(readConfigFile).mockResolvedValue({ "default-profile": "default" });
      vi.mocked(getProfile).mockReturnValue(undefined);

      const result = await client.callTool({
        name: "auth_status",
        arguments: { profile: "work" },
      });

      expect(getProfile).toHaveBeenCalledWith(expect.anything(), "work");
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Profile: work"),
        },
      ]);
    });
  });
});
