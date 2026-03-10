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
  createComment,
  listComments,
  getComment,
  deleteComment,
} from "@linkedctl/core";

describe("comment tools", () => {
  const { getClient } = setupMcpTestClient();

  describe("comment_create", () => {
    it("creates a comment and returns the URN", async () => {
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
      vi.mocked(createComment).mockResolvedValue("urn:li:comment:(urn:li:activity:100,200)");

      const result = await getClient().callTool({
        name: "comment_create",
        arguments: {
          post_urn: "urn:li:share:123",
          text: "Great post!",
        },
      });

      expect(createComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actor: "urn:li:person:abc123",
          object: "urn:li:share:123",
          message: "Great post!",
        }),
      );
      expect(result.content).toEqual([
        { type: "text", text: "Comment created: urn:li:comment:(urn:li:activity:100,200)" },
      ]);
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
      vi.mocked(createComment).mockResolvedValue("urn:li:comment:(urn:li:activity:100,300)");

      const result = await getClient().callTool({
        name: "comment_create",
        arguments: {
          post_urn: "urn:li:share:123",
          text: "Official reply",
          as_org: "99999",
        },
      });

      expect(getCurrentPersonUrn).not.toHaveBeenCalled();
      expect(createComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actor: "urn:li:organization:99999",
          object: "urn:li:share:123",
          message: "Official reply",
        }),
      );
      expect(result.content).toEqual([
        { type: "text", text: "Comment created: urn:li:comment:(urn:li:activity:100,300)" },
      ]);
    });
  });

  describe("comment_list", () => {
    it("lists comments on a post", async () => {
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
      vi.mocked(listComments).mockResolvedValue([
        {
          urn: "urn:li:comment:(urn:li:activity:100,200)",
          actor: "urn:li:person:abc",
          object: "urn:li:share:123",
          message: "Great post!",
          createdAt: "2024-11-14T22:13:20.000Z",
        },
      ]);

      const result = await getClient().callTool({
        name: "comment_list",
        arguments: { post_urn: "urn:li:share:123" },
      });

      expect(listComments).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ object: "urn:li:share:123" }),
      );
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Great post!"),
        },
      ]);
    });

    it("returns message when no comments exist", async () => {
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
      vi.mocked(listComments).mockResolvedValue([]);

      const result = await getClient().callTool({
        name: "comment_list",
        arguments: { post_urn: "urn:li:share:123" },
      });

      expect(result.content).toEqual([{ type: "text", text: "No comments found." }]);
    });
  });

  describe("comment_get", () => {
    it("gets a comment by URN", async () => {
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
      vi.mocked(getComment).mockResolvedValue({
        urn: "urn:li:comment:(urn:li:activity:100,200)",
        actor: "urn:li:person:abc",
        object: "urn:li:share:123",
        message: "A comment",
        createdAt: "2024-11-14T22:13:20.000Z",
      });

      const result = await getClient().callTool({
        name: "comment_get",
        arguments: { comment_urn: "urn:li:comment:(urn:li:activity:100,200)" },
      });

      expect(getComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          commentUrn: "urn:li:comment:(urn:li:activity:100,200)",
        }),
      );
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("A comment"),
        },
      ]);
    });
  });

  describe("comment_create auth error", () => {
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
      vi.mocked(getCurrentPersonUrn).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({
        name: "comment_create",
        arguments: { post_urn: "urn:li:share:123", text: "test" },
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
      vi.mocked(getCurrentPersonUrn).mockRejectedValue(new Error("Server error"));

      const result = await getClient().callTool({
        name: "comment_create",
        arguments: { post_urn: "urn:li:share:123", text: "test" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
    });
  });

  describe("comment_delete", () => {
    it("deletes a comment by URN", async () => {
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
      vi.mocked(deleteComment).mockResolvedValue(undefined);

      const result = await getClient().callTool({
        name: "comment_delete",
        arguments: { comment_urn: "urn:li:comment:(urn:li:activity:100,200)" },
      });

      expect(deleteComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          commentUrn: "urn:li:comment:(urn:li:activity:100,200)",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Comment deleted." }]);
    });
  });
});
