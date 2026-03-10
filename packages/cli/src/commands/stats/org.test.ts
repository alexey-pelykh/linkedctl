// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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
    getOrgStats: vi.fn().mockResolvedValue({
      elements: [
        {
          organizationalEntity: "urn:li:organization:12345",
          totalShareStatistics: {
            clickCount: 100,
            commentCount: 25,
            engagement: 0.05,
            impressionCount: 1000,
            likeCount: 50,
            shareCount: 10,
            uniqueImpressionsCount: 800,
          },
        },
      ],
      paging: { count: 1, start: 0 },
    }),
  };
});

const coreMock = await import("@linkedctl/core");

describe("stats org", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches lifetime org statistics", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "org", "12345"]);

    expect(coreMock.getOrgStats).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationUrn: "urn:li:organization:12345",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "org", "12345", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("elements");
  });

  it("passes time range and granularity for time-bound queries", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "org",
      "12345",
      "--from",
      "2025-01-01",
      "--to",
      "2025-06-01",
    ]);

    expect(coreMock.getOrgStats).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationUrn: "urn:li:organization:12345",
        timeGranularity: "MONTH",
        timeRange: {
          start: new Date("2025-01-01").getTime(),
          end: new Date("2025-06-01").getTime(),
        },
      }),
    );
  });

  it("passes daily granularity when --granularity day is specified", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "org",
      "12345",
      "--from",
      "2025-01-01",
      "--to",
      "2025-02-01",
      "--granularity",
      "day",
    ]);

    expect(coreMock.getOrgStats).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        timeGranularity: "DAY",
      }),
    );
  });

  it("rejects --from without --to", async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "linkedctl", "stats", "org", "12345", "--from", "2025-01-01"]),
    ).rejects.toThrow(/Both --from and --to must be specified together/);
  });

  it("rejects --granularity without date range", async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "linkedctl", "stats", "org", "12345", "--granularity", "day"]),
    ).rejects.toThrow(/--granularity requires --from and --to/);
  });

  it("resolves config with required scopes", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "org", "12345"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredScopes: ["rw_organization_admin"],
      }),
    );
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "analytics", "stats", "org", "12345"]);

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
    await expect(program.parseAsync(["node", "linkedctl", "stats", "org", "12345"])).rejects.toThrow(
      /Failed to get organization statistics/,
    );
  });
});
