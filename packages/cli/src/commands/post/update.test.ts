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
    updatePost: vi.fn().mockResolvedValue(undefined),
  };
});

const coreMock = await import("@linkedctl/core");

describe("post update", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates a post with --text option", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "update", "urn:li:share:123", "--text", "Updated content"]);

    expect(coreMock.updatePost).toHaveBeenCalledWith(expect.anything(), "urn:li:share:123", {
      text: "Updated content",
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "post",
      "update",
      "urn:li:share:123",
      "--text",
      "New text",
      "--format",
      "json",
    ]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("urn", "urn:li:share:123");
    expect(parsed).toHaveProperty("status", "updated");
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "--profile",
      "work",
      "post",
      "update",
      "urn:li:share:123",
      "--text",
      "Hello",
    ]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.updatePost).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "post", "update", "urn:li:share:123", "--text", "New"]),
    ).rejects.toThrow(/Failed to update post/);
  });
});
