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

import { resolveConfig, getPostAnalytics, getMemberAnalytics, getOrgStats } from "@linkedctl/core";

describe("stats tools", () => {
  const { getClient } = setupMcpTestClient();

  describe("stats_post", () => {
    it("returns analytics for a post with default aggregation", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      const mockAnalytics = {
        impressions: { status: "success", dataPoints: [{ count: 1000 }] },
        membersReached: { status: "success", dataPoints: [{ count: 800 }] },
        reactions: { status: "success", dataPoints: [{ count: 50 }] },
        comments: { status: "success", dataPoints: [{ count: 10 }] },
        reshares: { status: "success", dataPoints: [{ count: 5 }] },
      };
      vi.mocked(getPostAnalytics).mockResolvedValue(mockAnalytics);

      const result = await getClient().callTool({
        name: "stats_post",
        arguments: { post_urn: "urn:li:share:123" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "r_member_postAnalytics"],
      });
      expect(getPostAnalytics).toHaveBeenCalledWith(expect.anything(), {
        postUrn: "urn:li:share:123",
        aggregation: undefined,
        dateRange: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("impressions");
      expect(parsed).toHaveProperty("membersReached");
      expect(parsed).toHaveProperty("reactions");
      expect(parsed).toHaveProperty("comments");
      expect(parsed).toHaveProperty("reshares");
    });

    it("passes aggregation and date range when provided", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getPostAnalytics).mockResolvedValue({
        impressions: { status: "excluded", reason: "not supported" },
        membersReached: { status: "excluded", reason: "not supported" },
        reactions: { status: "success", dataPoints: [{ count: 3 }] },
        comments: { status: "success", dataPoints: [{ count: 1 }] },
        reshares: { status: "success", dataPoints: [{ count: 0 }] },
      });

      await getClient().callTool({
        name: "stats_post",
        arguments: {
          post_urn: "urn:li:share:456",
          aggregation: "DAILY",
          from: "2025-01-01",
          to: "2025-01-31",
        },
      });

      expect(getPostAnalytics).toHaveBeenCalledWith(expect.anything(), {
        postUrn: "urn:li:share:456",
        aggregation: "DAILY",
        dateRange: {
          start: { year: 2025, month: 1, day: 1 },
          end: { year: 2025, month: 1, day: 31 },
        },
      });
    });

    it("passes profile parameter to resolveConfig", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getPostAnalytics).mockResolvedValue({
        impressions: { status: "success", dataPoints: [{ count: 0 }] },
        membersReached: { status: "success", dataPoints: [{ count: 0 }] },
        reactions: { status: "success", dataPoints: [{ count: 0 }] },
        comments: { status: "success", dataPoints: [{ count: 0 }] },
        reshares: { status: "success", dataPoints: [{ count: 0 }] },
      });

      await getClient().callTool({
        name: "stats_post",
        arguments: { post_urn: "urn:li:share:789", profile: "analytics" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "analytics",
        requiredScopes: ["openid", "profile", "email", "r_member_postAnalytics"],
      });
    });

    it("passes only from date when to is omitted", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getPostAnalytics).mockResolvedValue({
        impressions: { status: "success", dataPoints: [{ count: 0 }] },
        membersReached: { status: "success", dataPoints: [{ count: 0 }] },
        reactions: { status: "success", dataPoints: [{ count: 0 }] },
        comments: { status: "success", dataPoints: [{ count: 0 }] },
        reshares: { status: "success", dataPoints: [{ count: 0 }] },
      });

      await getClient().callTool({
        name: "stats_post",
        arguments: { post_urn: "urn:li:share:123", from: "2025-06-01" },
      });

      expect(getPostAnalytics).toHaveBeenCalledWith(expect.anything(), {
        postUrn: "urn:li:share:123",
        aggregation: undefined,
        dateRange: { start: { year: 2025, month: 6, day: 1 } },
      });
    });

    it("passes only to date when from is omitted", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getPostAnalytics).mockResolvedValue({
        impressions: { status: "success", dataPoints: [{ count: 0 }] },
        membersReached: { status: "success", dataPoints: [{ count: 0 }] },
        reactions: { status: "success", dataPoints: [{ count: 0 }] },
        comments: { status: "success", dataPoints: [{ count: 0 }] },
        reshares: { status: "success", dataPoints: [{ count: 0 }] },
      });

      await getClient().callTool({
        name: "stats_post",
        arguments: { post_urn: "urn:li:share:123", to: "2025-12-31" },
      });

      expect(getPostAnalytics).toHaveBeenCalledWith(expect.anything(), {
        postUrn: "urn:li:share:123",
        aggregation: undefined,
        dateRange: { end: { year: 2025, month: 12, day: 31 } },
      });
    });
  });

  describe("stats_me", () => {
    it("returns lifetime aggregate stats without date range", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      const mockAnalytics = {
        impressions: { status: "success", dataPoints: [{ count: 50000 }] },
        membersReached: { status: "success", dataPoints: [{ count: 30000 }] },
        reactions: { status: "success", dataPoints: [{ count: 2000 }] },
        comments: { status: "success", dataPoints: [{ count: 500 }] },
        reshares: { status: "success", dataPoints: [{ count: 200 }] },
      };
      vi.mocked(getMemberAnalytics).mockResolvedValue(mockAnalytics);

      const result = await getClient().callTool({
        name: "stats_me",
        arguments: {},
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "r_member_postAnalytics"],
      });
      expect(getMemberAnalytics).toHaveBeenCalledWith(expect.anything(), {
        aggregation: undefined,
        dateRange: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("impressions");
      expect(parsed).toHaveProperty("reshares");
    });

    it("passes date range when from and to are provided", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getMemberAnalytics).mockResolvedValue({
        impressions: { status: "success", dataPoints: [{ count: 100 }] },
        membersReached: { status: "success", dataPoints: [{ count: 80 }] },
        reactions: { status: "success", dataPoints: [{ count: 10 }] },
        comments: { status: "success", dataPoints: [{ count: 2 }] },
        reshares: { status: "success", dataPoints: [{ count: 1 }] },
      });

      await getClient().callTool({
        name: "stats_me",
        arguments: { from: "2025-03-01", to: "2025-03-10" },
      });

      expect(getMemberAnalytics).toHaveBeenCalledWith(expect.anything(), {
        aggregation: undefined,
        dateRange: {
          start: { year: 2025, month: 3, day: 1 },
          end: { year: 2025, month: 3, day: 10 },
        },
      });
    });

    it("returns lifetime totals when no date range is provided", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getMemberAnalytics).mockResolvedValue({
        impressions: { status: "success", dataPoints: [{ count: 99999 }] },
        membersReached: { status: "success", dataPoints: [{ count: 50000 }] },
        reactions: { status: "success", dataPoints: [{ count: 5000 }] },
        comments: { status: "success", dataPoints: [{ count: 1000 }] },
        reshares: { status: "success", dataPoints: [{ count: 500 }] },
      });

      const result = await getClient().callTool({
        name: "stats_me",
        arguments: {},
      });

      expect(getMemberAnalytics).toHaveBeenCalledWith(expect.anything(), {
        aggregation: undefined,
        dateRange: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("impressions");
    });

    it("passes profile parameter to resolveConfig", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      vi.mocked(getMemberAnalytics).mockResolvedValue({
        impressions: { status: "success", dataPoints: [{ count: 0 }] },
        membersReached: { status: "success", dataPoints: [{ count: 0 }] },
        reactions: { status: "success", dataPoints: [{ count: 0 }] },
        comments: { status: "success", dataPoints: [{ count: 0 }] },
        reshares: { status: "success", dataPoints: [{ count: 0 }] },
      });

      await getClient().callTool({
        name: "stats_me",
        arguments: { profile: "community-mgmt" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "community-mgmt",
        requiredScopes: ["openid", "profile", "email", "r_member_postAnalytics"],
      });
    });
  });

  describe("stats_org", () => {
    it("returns lifetime aggregate stats for an organization", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);

      const mockResponse = {
        elements: [
          {
            organizationalEntity: "urn:li:organization:12345",
            totalShareStatistics: {
              clickCount: 10,
              commentCount: 5,
              engagement: 0.02,
              impressionCount: 500,
              likeCount: 20,
              shareCount: 3,
              uniqueImpressionsCount: 400,
            },
          },
        ],
        paging: { count: 1, start: 0 },
      };
      vi.mocked(getOrgStats).mockResolvedValue(mockResponse);

      const result = await getClient().callTool({ name: "stats_org", arguments: { id: "12345" } });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["rw_organization_admin"],
      });
      expect(getOrgStats).toHaveBeenCalledWith(expect.anything(), {
        organizationUrn: "urn:li:organization:12345",
        timeGranularity: undefined,
        timeRange: undefined,
        shares: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("elements");
    });

    it("passes time range and granularity", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);
      vi.mocked(getOrgStats).mockResolvedValue({ elements: [], paging: { count: 0, start: 0 } });

      await getClient().callTool({
        name: "stats_org",
        arguments: { id: "12345", time_granularity: "MONTH", start: "2026-01-01", end: "2026-02-01" },
      });

      expect(getOrgStats).toHaveBeenCalledWith(expect.anything(), {
        organizationUrn: "urn:li:organization:12345",
        timeGranularity: "MONTH",
        timeRange: {
          start: new Date("2026-01-01").getTime(),
          end: new Date("2026-02-01").getTime(),
        },
        shares: undefined,
      });
    });

    it("passes share URNs when provided", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);
      vi.mocked(getOrgStats).mockResolvedValue({ elements: [], paging: { count: 0, start: 0 } });

      await getClient().callTool({
        name: "stats_org",
        arguments: { id: "12345", shares: "urn:li:share:aaa,urn:li:share:bbb" },
      });

      expect(getOrgStats).toHaveBeenCalledWith(expect.anything(), {
        organizationUrn: "urn:li:organization:12345",
        timeGranularity: undefined,
        timeRange: undefined,
        shares: ["urn:li:share:aaa", "urn:li:share:bbb"],
      });
    });

    it("passes profile parameter to resolveConfig", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: { oauth: { accessToken: "tok" }, apiVersion: "202601" },
        warnings: [],
      } as never);
      vi.mocked(getOrgStats).mockResolvedValue({ elements: [], paging: { count: 0, start: 0 } });

      await getClient().callTool({ name: "stats_org", arguments: { id: "12345", profile: "work" } });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["rw_organization_admin"],
      });
    });

    it("returns error when start is provided without end", async () => {
      const result = await getClient().callTool({
        name: "stats_org",
        arguments: { id: "12345", start: "2026-01-01" },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      expect(text).toContain("Both start and end must be provided");
    });

    it("returns error when end is provided without start", async () => {
      const result = await getClient().callTool({
        name: "stats_org",
        arguments: { id: "12345", end: "2026-02-01" },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      expect(text).toContain("Both start and end must be provided");
    });

    it("returns error when time_granularity is provided without date range", async () => {
      const result = await getClient().callTool({
        name: "stats_org",
        arguments: { id: "12345", time_granularity: "DAY" },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      expect(text).toContain("time_granularity requires both start and end");
    });
  });
});
