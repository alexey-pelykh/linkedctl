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
    getMemberAnalytics: vi.fn(),
  };
});

const coreMock = await import("@linkedctl/core");

const SAMPLE_TOTAL_ANALYTICS: PostAnalytics = {
  impressions: { status: "success", dataPoints: [{ count: 5678 }] },
  membersReached: { status: "success", dataPoints: [{ count: 1234 }] },
  reactions: { status: "success", dataPoints: [{ count: 234 }] },
  comments: { status: "success", dataPoints: [{ count: 56 }] },
  reshares: { status: "success", dataPoints: [{ count: 23 }] },
};

const SAMPLE_DAILY_ANALYTICS: PostAnalytics = {
  impressions: {
    status: "success",
    dataPoints: [
      { count: 100, dateRange: { start: { year: 2024, month: 5, day: 1 }, end: { year: 2024, month: 5, day: 2 } } },
      { count: 120, dateRange: { start: { year: 2024, month: 5, day: 2 }, end: { year: 2024, month: 5, day: 3 } } },
    ],
  },
  membersReached: {
    status: "excluded",
    reason: "MEMBERS_REACHED with DAILY aggregation is not supported by the LinkedIn API",
  },
  reactions: {
    status: "success",
    dataPoints: [
      { count: 10, dateRange: { start: { year: 2024, month: 5, day: 1 }, end: { year: 2024, month: 5, day: 2 } } },
      { count: 15, dateRange: { start: { year: 2024, month: 5, day: 2 }, end: { year: 2024, month: 5, day: 3 } } },
    ],
  },
  comments: {
    status: "success",
    dataPoints: [
      { count: 2, dateRange: { start: { year: 2024, month: 5, day: 1 }, end: { year: 2024, month: 5, day: 2 } } },
      { count: 3, dateRange: { start: { year: 2024, month: 5, day: 2 }, end: { year: 2024, month: 5, day: 3 } } },
    ],
  },
  reshares: {
    status: "success",
    dataPoints: [
      { count: 1, dateRange: { start: { year: 2024, month: 5, day: 1 }, end: { year: 2024, month: 5, day: 2 } } },
      { count: 0, dateRange: { start: { year: 2024, month: 5, day: 2 }, end: { year: 2024, month: 5, day: 3 } } },
    ],
  },
};

describe("stats me", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(coreMock.getMemberAnalytics).mockResolvedValue(SAMPLE_TOTAL_ANALYTICS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays lifetime totals table when no date range is given (TTY)", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "stats", "me"]);

      expect(coreMock.getMemberAnalytics).toHaveBeenCalledWith(expect.anything(), undefined);
      expect(consoleSpy).toHaveBeenCalledOnce();

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("Impressions");
      expect(output).toContain("5678");
      expect(output).toContain("Members reached");
      expect(output).toContain("1234");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("outputs JSON for lifetime totals when piped", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "stats", "me"]);

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(output) as PostAnalytics;
      expect(parsed.impressions).toEqual({ status: "success", dataPoints: [{ count: 5678 }] });
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("displays daily breakdown table with --from and --to (TTY)", async () => {
    vi.mocked(coreMock.getMemberAnalytics).mockResolvedValueOnce(SAMPLE_DAILY_ANALYTICS);

    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    try {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "stats", "me", "--from", "2024-05-01", "--to", "2024-05-02"]);

      expect(coreMock.getMemberAnalytics).toHaveBeenCalledWith(expect.anything(), {
        aggregation: "DAILY",
        dateRange: {
          start: { year: 2024, month: 5, day: 1 },
          end: { year: 2024, month: 5, day: 3 },
        },
      });

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("2024-05-01");
      expect(output).toContain("2024-05-02");
      expect(output).toContain("100");
      expect(output).toContain("120");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("outputs JSON for daily breakdown with --format json", async () => {
    vi.mocked(coreMock.getMemberAnalytics).mockResolvedValueOnce(SAMPLE_DAILY_ANALYTICS);

    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "me",
      "--from",
      "2024-05-01",
      "--to",
      "2024-05-02",
      "--format",
      "json",
    ]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as PostAnalytics;
    expect(parsed.impressions.status).toBe("success");
  });

  it("errors when --from is given without --to", async () => {
    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "stats", "me", "--from", "2024-05-01"])).rejects.toThrow(
      "--from and --to must be used together",
    );
  });

  it("errors when --to is given without --from", async () => {
    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "stats", "me", "--to", "2024-05-31"])).rejects.toThrow(
      "--from and --to must be used together",
    );
  });

  it("errors on invalid date format", async () => {
    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "stats", "me", "--from", "05/01/2024", "--to", "05/31/2024"]),
    ).rejects.toThrow(/Invalid date format.*Expected YYYY-MM-DD/);
  });

  it("errors on invalid date values", async () => {
    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "stats", "me", "--from", "2024-13-01", "--to", "2024-13-31"]),
    ).rejects.toThrow(/Invalid date.*Month must be 1-12/);
  });

  it("warns about excluded metrics on stderr for daily breakdown", async () => {
    vi.mocked(coreMock.getMemberAnalytics).mockResolvedValueOnce(SAMPLE_DAILY_ANALYTICS);

    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "me",
      "--from",
      "2024-05-01",
      "--to",
      "2024-05-02",
      "--format",
      "json",
    ]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Members reached"));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("DAILY aggregation is not supported"));
  });

  it("resolves config with r_member_postAnalytics scope", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "stats", "me", "--format", "json"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredScopes: ["r_member_postAnalytics"],
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.getMemberAnalytics).mockRejectedValueOnce(new LinkedInApiError("Server Error", 500));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "stats", "me"])).rejects.toThrow(
      /Failed to get member analytics/,
    );
  });

  it("enhances scope mismatch error with analytics profile suggestion", async () => {
    const { ConfigError } = await import("@linkedctl/core");
    vi.mocked(coreMock.resolveConfig).mockRejectedValueOnce(
      new ConfigError("Missing required OAuth scopes: r_member_postAnalytics."),
    );

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "stats", "me"])).rejects.toThrow(
      /dedicated analytics profile.*--profile analytics/,
    );
  });

  it("converts inclusive --to date to exclusive API end date", async () => {
    vi.mocked(coreMock.getMemberAnalytics).mockResolvedValueOnce(SAMPLE_DAILY_ANALYTICS);

    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "stats",
      "me",
      "--from",
      "2024-12-30",
      "--to",
      "2024-12-31",
      "--format",
      "json",
    ]);

    expect(coreMock.getMemberAnalytics).toHaveBeenCalledWith(expect.anything(), {
      aggregation: "DAILY",
      dateRange: {
        start: { year: 2024, month: 12, day: 30 },
        end: { year: 2025, month: 1, day: 1 },
      },
    });
  });
});
