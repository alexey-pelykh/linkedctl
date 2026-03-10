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
  listOrganizations,
  getOrganization,
  getOrganizationFollowerCount,
} from "@linkedctl/core";

describe("org tools", () => {
  const { getClient } = setupMcpTestClient();

  describe("org_list", () => {
    it("lists administered organizations", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      const mockResponse = {
        elements: [{ organization: "urn:li:organization:123", role: "ADMINISTRATOR", state: "APPROVED" }],
        paging: { count: 10, start: 0, total: 1 },
      };
      vi.mocked(listOrganizations).mockResolvedValue(mockResponse);

      const result = await getClient().callTool({ name: "org_list", arguments: {} });

      expect(listOrganizations).toHaveBeenCalledWith(expect.anything(), {
        count: undefined,
        start: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("elements");
    });

    it("passes count and start parameters", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);
      vi.mocked(listOrganizations).mockResolvedValue({
        elements: [],
        paging: { count: 5, start: 10 },
      });

      await getClient().callTool({ name: "org_list", arguments: { count: 5, start: 10 } });

      expect(listOrganizations).toHaveBeenCalledWith(expect.anything(), { count: 5, start: 10 });
    });
  });

  describe("org_list auth error", () => {
    it("returns error with re-auth guidance for expired token", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "expired-token" },
          apiVersion: "202401",
        },
        warnings: [],
      } as never);
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(listOrganizations).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({ name: "org_list", arguments: {} });

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
      } as never);
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(listOrganizations).mockRejectedValue(new Error("Server error"));

      const result = await getClient().callTool({ name: "org_list", arguments: {} });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
    });
  });

  describe("org_get", () => {
    it("fetches organization details by ID", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      const mockOrg = {
        id: 12345,
        localizedName: "Acme Corp",
        localizedDescription: "A great company",
        vanityName: "acme-corp",
      };
      vi.mocked(getOrganization).mockResolvedValue(mockOrg);

      const result = await getClient().callTool({ name: "org_get", arguments: { id: "12345" } });

      expect(getOrganization).toHaveBeenCalledWith(expect.anything(), "12345");
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("localizedName", "Acme Corp");
    });
  });

  describe("org_followers", () => {
    it("returns follower count for an organization", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getOrganizationFollowerCount).mockResolvedValue(5000);

      const result = await getClient().callTool({ name: "org_followers", arguments: { id: "12345" } });

      expect(getOrganizationFollowerCount).toHaveBeenCalledWith(expect.anything(), "urn:li:organization:12345");
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("organization", "urn:li:organization:12345");
      expect(parsed).toHaveProperty("followerCount", 5000);
    });
  });
});
