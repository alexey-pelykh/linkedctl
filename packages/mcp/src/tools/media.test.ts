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

import { readFile, stat } from "node:fs/promises";
import {
  resolveConfig,
  LinkedInClient,
  LinkedInAuthError,
  getCurrentPersonUrn,
  getOrganization,
  uploadDocument,
} from "@linkedctl/core";

describe("media tools", () => {
  const { getClient } = setupMcpTestClient();

  describe("document_upload", () => {
    it("uploads a document and returns the URN", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
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
      vi.mocked(uploadDocument).mockResolvedValue("urn:li:document:D123");

      const result = await getClient().callTool({
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(uploadDocument).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:person:abc123",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Document uploaded: urn:li:document:D123" }]);
    });

    it("returns error for unsupported file type", async () => {
      const result = await getClient().callTool({
        name: "document_upload",
        arguments: { file: "/path/to/image.png" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Unsupported file type"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("returns error when file exceeds size limit", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 200 * 1024 * 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);

      const result = await getClient().callTool({
        name: "document_upload",
        arguments: { file: "/path/to/huge.pdf" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("exceeds the 100 MB limit"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("passes profile option", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
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
      vi.mocked(uploadDocument).mockResolvedValue("urn:li:document:D456");

      await getClient().callTool({
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf", profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
    });

    it("returns error with re-auth guidance for expired token", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
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
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf" },
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
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
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
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
    });

    it("uploads as organization when as_org is specified", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
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
      vi.mocked(getOrganization).mockResolvedValue({ id: 12345, localizedName: "Test Org" });
      vi.mocked(uploadDocument).mockResolvedValue("urn:li:document:D789");

      const result = await getClient().callTool({
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf", as_org: "12345" },
      });

      expect(getOrganization).toHaveBeenCalledWith(expect.anything(), "12345");
      expect(uploadDocument).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:organization:12345",
        }),
      );
      expect(getCurrentPersonUrn).not.toHaveBeenCalled();
      expect(result.content).toEqual([{ type: "text", text: "Document uploaded: urn:li:document:D789" }]);
    });
  });
});
