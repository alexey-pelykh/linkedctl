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
  loadConfigFile: vi.fn(),
  validateConfig: vi.fn(),
  getTokenExpiry: vi.fn(),
  clearOAuthTokens: vi.fn(),
  revokeAccessToken: vi.fn(),
}));

import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  createTextPost,
  loadConfigFile,
  validateConfig,
  getTokenExpiry,
  clearOAuthTokens,
  revokeAccessToken,
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

  it("lists post_create, auth_status, and auth_revoke tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain("post_create");
    expect(toolNames).toContain("auth_status");
    expect(toolNames).toContain("auth_revoke");
  });

  describe("post_create", () => {
    it("creates a post and returns the URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
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

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
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
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
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

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
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
      vi.mocked(loadConfigFile).mockResolvedValue({ raw: undefined, path: undefined });
      vi.mocked(validateConfig).mockReturnValue({
        config: {},
        warnings: [],
        errors: [],
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(loadConfigFile).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: not configured"),
        },
      ]);
    });

    it("reports authenticated with expiry for valid JWT", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { oauth: { "access-token": "valid-jwt-token" }, "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "valid-jwt-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
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
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { oauth: { "access-token": "expired-jwt-token" }, "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "expired-jwt-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
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
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { oauth: { "access-token": "opaque-token" }, "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "opaque-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
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
      vi.mocked(loadConfigFile).mockResolvedValue({ raw: undefined, path: undefined });
      vi.mocked(validateConfig).mockReturnValue({
        config: {},
        warnings: [],
        errors: [],
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: { profile: "work" },
      });

      expect(loadConfigFile).toHaveBeenCalledWith({ profile: "work" });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Profile: work"),
        },
      ]);
    });
  });

  describe("auth_revoke", () => {
    it("revokes token server-side and clears local credentials", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: {
          oauth: {
            "access-token": "my-token",
            "client-id": "cid",
            "client-secret": "csecret",
          },
          "api-version": "202401",
        },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: {
            accessToken: "my-token",
            clientId: "cid",
            clientSecret: "csecret",
          },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(revokeAccessToken).mockResolvedValue(undefined);
      vi.mocked(clearOAuthTokens).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(revokeAccessToken).toHaveBeenCalledWith("cid", "csecret", "my-token");
      expect(clearOAuthTokens).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Access token revoked server-side"),
        },
      ]);
    });

    it("clears local credentials with warning when server-side revocation fails", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: {
          oauth: {
            "access-token": "my-token",
            "client-id": "cid",
            "client-secret": "csecret",
          },
          "api-version": "202401",
        },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: {
            accessToken: "my-token",
            clientId: "cid",
            clientSecret: "csecret",
          },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(revokeAccessToken).mockRejectedValue(new Error("network error"));
      vi.mocked(clearOAuthTokens).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(clearOAuthTokens).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Warning: Server-side revocation failed"),
        },
      ]);
    });

    it("returns error when profile has no OAuth config", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: { apiVersion: "202401" },
        warnings: [],
        errors: [],
      });

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("not found or has no OAuth config"),
        },
      ]);
    });

    it("clears local credentials when client credentials are missing", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: {
          oauth: { "access-token": "my-token" },
          "api-version": "202401",
        },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "my-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(clearOAuthTokens).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(revokeAccessToken).not.toHaveBeenCalled();
      expect(clearOAuthTokens).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("No complete credentials for server-side revocation"),
        },
      ]);
    });
  });
});
