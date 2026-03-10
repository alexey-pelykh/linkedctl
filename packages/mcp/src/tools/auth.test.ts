// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { setupMcpTestClient } from "./test-setup.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("@linkedctl/core", () => ({
  resolveConfig: vi.fn(),
  LinkedInClient: vi.fn(),
  LinkedInAuthError: class LinkedInAuthError extends Error {
    public readonly status = 401;
    constructor(message: string) {
      super(message);
      this.name = "LinkedInAuthError";
    }
  },
  getCurrentPersonUrn: vi.fn(),
  getUserInfo: vi.fn(),
  createTextPost: vi.fn(),
  createPost: vi.fn(),
  createComment: vi.fn(),
  listComments: vi.fn(),
  getComment: vi.fn(),
  deleteComment: vi.fn(),
  getPost: vi.fn(),
  listPosts: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  uploadImage: vi.fn(),
  uploadVideo: vi.fn(),
  uploadDocument: vi.fn(),
  createReaction: vi.fn(),
  listReactions: vi.fn(),
  deleteReaction: vi.fn(),
  listOrganizations: vi.fn(),
  getOrganization: vi.fn(),
  getOrganizationFollowerCount: vi.fn(),
  getPostAnalytics: vi.fn(),
  getMemberAnalytics: vi.fn(),
  getOrgStats: vi.fn(),
  SUPPORTED_IMAGE_TYPES: new Map([
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
    [".gif", "image/gif"],
  ]),
  DOCUMENT_EXTENSIONS: [".pdf", ".docx", ".pptx", ".doc", ".ppt"],
  DOCUMENT_MAX_SIZE_BYTES: 100 * 1024 * 1024,
  REACTION_TYPES: ["LIKE", "PRAISE", "EMPATHY", "INTEREST", "APPRECIATION", "ENTERTAINMENT"],
  loadConfigFile: vi.fn(),
  validateConfig: vi.fn(),
  getTokenExpiry: vi.fn(),
  clearOAuthTokens: vi.fn(),
  revokeAccessToken: vi.fn(),
}));

import {
  resolveConfig,
  LinkedInClient,
  LinkedInAuthError,
  getUserInfo,
  loadConfigFile,
  validateConfig,
  getTokenExpiry,
  clearOAuthTokens,
  revokeAccessToken,
} from "@linkedctl/core";

describe("auth tools", () => {
  const { getClient } = setupMcpTestClient();

  describe("whoami", () => {
    it("returns user name, email, and picture", async () => {
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
      vi.mocked(getUserInfo).mockResolvedValue({
        sub: "abc123",
        name: "Jane Doe",
        given_name: "Jane",
        family_name: "Doe",
        picture: "https://media.licdn.com/photo.jpg",
        email: "jane@example.com",
        email_verified: true,
      });

      const result = await getClient().callTool({
        name: "whoami",
        arguments: {},
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email"],
      });
      expect(result.content).toEqual([
        {
          type: "text",
          text: "Name: Jane Doe\nEmail: jane@example.com\nPicture: https://media.licdn.com/photo.jpg",
        },
      ]);
    });

    it("passes profile option", async () => {
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
      vi.mocked(getUserInfo).mockResolvedValue({
        sub: "xyz789",
        name: "John Smith",
        given_name: "John",
        family_name: "Smith",
        picture: "https://media.licdn.com/photo2.jpg",
        email: "john@example.com",
        email_verified: true,
      });

      const result = await getClient().callTool({
        name: "whoami",
        arguments: { profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email"],
      });
      expect(result.content).toEqual([
        {
          type: "text",
          text: "Name: John Smith\nEmail: john@example.com\nPicture: https://media.licdn.com/photo2.jpg",
        },
      ]);
    });

    it("returns error with re-auth guidance for expired token", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "expired-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getUserInfo).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({
        name: "whoami",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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
