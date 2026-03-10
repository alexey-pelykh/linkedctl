// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { PostAnalytics } from "@linkedctl/core";
import { createProgram } from "../../program.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@linkedctl/core")>();
  return {
    ...actual,
    resolveConfig: vi.fn().mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    }),
    getPostAnalytics: vi.fn(),
    getOrgStats: vi.fn().mockResolvedValue({
      elements: [
        {
          organizationalEntity: "urn:li:organization:12345",
          share: "urn:li:share:999",
          totalShareStatistics: {
            clickCount: 42,
            commentCount: 5,
            engagement: 0.03,
            impressionCount: 500,
            likeCount: 20,
            shareCount: 3,
            uniqueImpressionsCount: 400,
          },
        },
      ],
      paging: { count: 1, start: 0 },
    }),
  };
});

const coreMock = await import("@linkedctl/core");

const SAMPLE_ANALYTICS: PostAnalytics = {
  impressions: { status: "success", dataPoints: [{ count: 1234 }] },
  membersReached: { status: "success", dataPoints: [{ count: 567 }] },
  reactions: { status: "success", dataPoints: [{ count: 89 }] },
  comments: { status: "success", dataPoints: [{ count: 12 }] },
  reshares: { status: "success", dataPoints: [{ count: 5 }] },
};

describe("stats post (member analytics)", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(coreMock.getPostAnalytics).mockResolvedValue(SAMPLE_ANALYTICS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays table with metric names and values for TTY", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123"]);

      expect(coreMock.getPostAnalytics).toHaveBeenCalledWith(expect.anything(), { postUrn: "urn:li:share:123" });
      expect(consoleSpy).toHaveBeenCalledOnce();

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("Impressions");
      expect(output).toContain("1234");
      expect(output).toContain("Members reached");
      expect(output).toContain("567");
      expect(output).toContain("Reactions");
      expect(output).toContain("89");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("outputs JSON when piped (non-TTY)", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123"]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as PostAnalytics;
      expect(parsed.impressions).toEqual({ status: "success", dataPoints: [{ count: 1234 }] });
      expect(parsed.reactions).toEqual({ status: "success", dataPoints: [{ count: 89 }] });
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as PostAnalytics;
    expect(parsed.impressions.status).toBe("success");
  });

  it("warns about unavailable metrics on stderr", async () => {
    const analyticsWithUnavailable: PostAnalytics = {
      ...SAMPLE_ANALYTICS,
      membersReached: { status: "unavailable", reason: "API error" },
    };
    vi.mocked(coreMock.getPostAnalytics).mockResolvedValueOnce(analyticsWithUnavailable);

    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123"]);

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Members reached: API error"));

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(output).not.toContain("Members reached");
      expect(output).toContain("Impressions");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("warns about excluded metrics on stderr", async () => {
    const analyticsWithExcluded: PostAnalytics = {
      ...SAMPLE_ANALYTICS,
      impressions: { status: "excluded", reason: "IMPRESSION with DAILY aggregation is not supported" },
    };
    vi.mocked(coreMock.getPostAnalytics).mockResolvedValueOnce(analyticsWithExcluded);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123", "--format", "json"]);

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("Impressions: IMPRESSION with DAILY aggregation is not supported"),
    );
  });

  it("resolves config with r_member_postAnalytics scope", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123", "--format", "json"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredScopes: ["r_member_postAnalytics"],
      }),
    );
  });

  it("passes profile flag to resolveConfig", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "--profile",
      "work",
      "stats",
      "post",
      "urn:li:share:123",
      "--format",
      "json",
    ]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.getPostAnalytics).mockRejectedValueOnce(new LinkedInApiError("Not Found", 404));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123"])).rejects.toThrow(
      /Failed to get post analytics/,
    );
  });

  it("enhances scope mismatch error with analytics profile suggestion", async () => {
    const { ConfigError } = await import("@linkedctl/core");
    vi.mocked(coreMock.resolveConfig).mockRejectedValueOnce(
      new ConfigError("Missing required OAuth scopes: r_member_postAnalytics."),
    );

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:123"])).rejects.toThrow(
      /dedicated analytics profile.*--profile analytics/,
    );
  });

  it("suggests profile-based analytics name when profile is set", async () => {
    const { ConfigError } = await import("@linkedctl/core");
    vi.mocked(coreMock.resolveConfig).mockRejectedValueOnce(
      new ConfigError("Missing required OAuth scopes: r_member_postAnalytics."),
    );

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "--profile", "work", "stats", "post", "urn:li:share:123"]),
    ).rejects.toThrow(/--profile work-analytics/);
  });

  it("outputs JSON when global --json is set", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "--json", "stats", "post", "urn:li:share:123"]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as PostAnalytics;
      expect(parsed.impressions.status).toBe("success");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });
});

describe("stats post --org (org share statistics)", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches per-post org statistics", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:999", "--org", "12345"]);

    expect(coreMock.getOrgStats).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationUrn: "urn:li:organization:12345",
        shares: ["urn:li:share:999"],
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "post",
      "urn:li:share:999",
      "--org",
      "12345",
      "--format",
      "json",
    ]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("elements");
  });

  it("resolves config with required scopes", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:999", "--org", "12345"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredScopes: ["rw_organization_admin"],
      }),
    );
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "--profile",
      "analytics",
      "stats",
      "post",
      "urn:li:share:999",
      "--org",
      "12345",
    ]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "analytics",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.getOrgStats).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    await expect(
      program.parseAsync(["node", "linkedctl", "stats", "post", "urn:li:share:999", "--org", "12345"]),
    ).rejects.toThrow(/Failed to get post statistics/);
  });

  it("handles empty results gracefully in table format", async () => {
    vi.mocked(coreMock.getOrgStats).mockResolvedValueOnce({
      elements: [],
      paging: { count: 0, start: 0 },
    });

    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "post",
      "urn:li:share:999",
      "--org",
      "12345",
      "--format",
      "table",
    ]);

    expect(consoleSpy).toHaveBeenCalledWith("No statistics found for this post.");
  });
});
