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
    getPost: vi.fn().mockResolvedValue({
      id: "urn:li:share:123",
      author: "urn:li:person:abc",
      commentary: "Hello LinkedIn",
      visibility: "PUBLIC",
      lifecycleState: "PUBLISHED",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      isReshareDisabledByAuthor: false,
    }),
  };
});

const coreMock = await import("@linkedctl/core");

describe("post get", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a post by URN", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "get", "urn:li:share:123"]);

    expect(coreMock.getPost).toHaveBeenCalledWith(expect.anything(), "urn:li:share:123");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "get", "urn:li:share:123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("id", "urn:li:share:123");
    expect(parsed).toHaveProperty("commentary", "Hello LinkedIn");
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "post", "get", "urn:li:share:123"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.getPost).mockRejectedValueOnce(new LinkedInApiError("Not Found", 404));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "post", "get", "urn:li:share:999"])).rejects.toThrow(
      /Failed to get post/,
    );
  });
});
