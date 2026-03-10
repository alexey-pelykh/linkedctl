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
  getCurrentPersonUrn,
  createReaction,
  listReactions,
  deleteReaction,
} from "@linkedctl/core";

describe("reaction tools", () => {
  const { getClient } = setupMcpTestClient();

  describe("reaction_create", () => {
    it("creates a LIKE reaction by default and returns the URN", async () => {
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
      vi.mocked(createReaction).mockResolvedValue("urn:li:reaction:r123");

      const result = await getClient().callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(createReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
          reactionType: "LIKE",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction created: urn:li:reaction:r123" }]);
    });

    it("creates a reaction with specified type", async () => {
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
      vi.mocked(createReaction).mockResolvedValue("urn:li:reaction:r456");

      const result = await getClient().callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123", reaction_type: "PRAISE" },
      });

      expect(createReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reactionType: "PRAISE",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction created: urn:li:reaction:r456" }]);
    });

    it("passes organization actor when as_org is specified", async () => {
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
      vi.mocked(createReaction).mockResolvedValue("urn:li:reaction:r789");

      const result = await getClient().callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123", as_org: "99999" },
      });

      expect(createReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
          reactionType: "LIKE",
          actor: "urn:li:organization:99999",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction created: urn:li:reaction:r789" }]);
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
      vi.mocked(createReaction).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("re-throws non-auth errors", async () => {
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
      vi.mocked(createReaction).mockRejectedValue(new Error("Server error"));

      const result = await getClient().callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
    });
  });

  describe("reaction_list", () => {
    it("lists reactions on a post", async () => {
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
      vi.mocked(listReactions).mockResolvedValue([
        {
          actor: "urn:li:person:user1",
          entity: "urn:li:share:abc123",
          reactionType: "LIKE",
          createdAt: 1700000000000,
        },
      ]);

      const result = await getClient().callTool({
        name: "reaction_list",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(listReactions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
        }),
      );
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("LIKE by urn:li:person:user1"),
        },
      ]);
    });

    it("returns message when no reactions found", async () => {
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
      vi.mocked(listReactions).mockResolvedValue([]);

      const result = await getClient().callTool({
        name: "reaction_list",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([{ type: "text", text: "No reactions found" }]);
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
      vi.mocked(listReactions).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({
        name: "reaction_list",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("re-throws non-auth errors", async () => {
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
      vi.mocked(listReactions).mockRejectedValue(new Error("Server error"));

      const result = await getClient().callTool({
        name: "reaction_list",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
    });
  });

  describe("reaction_delete", () => {
    it("deletes the user's reaction from a post", async () => {
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
      vi.mocked(deleteReaction).mockResolvedValue(undefined);

      const result = await getClient().callTool({
        name: "reaction_delete",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(deleteReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
          actor: "urn:li:person:abc123",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction deleted" }]);
    });

    it("uses organization URN as actor when as_org is specified", async () => {
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
      vi.mocked(deleteReaction).mockResolvedValue(undefined);

      const result = await getClient().callTool({
        name: "reaction_delete",
        arguments: { entity_urn: "urn:li:share:abc123", as_org: "99999" },
      });

      expect(getCurrentPersonUrn).not.toHaveBeenCalled();
      expect(deleteReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
          actor: "urn:li:organization:99999",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction deleted" }]);
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
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(deleteReaction).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({
        name: "reaction_delete",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("re-throws non-auth errors", async () => {
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
      vi.mocked(deleteReaction).mockRejectedValue(new Error("Server error"));

      const result = await getClient().callTool({
        name: "reaction_delete",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
    });
  });
});
