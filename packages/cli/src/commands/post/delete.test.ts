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
    deletePost: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../../confirm.js", () => ({
  confirmOrAbort: vi.fn().mockResolvedValue(undefined),
}));

const coreMock = await import("@linkedctl/core");
const confirmMock = await import("../../confirm.js");

describe("post delete", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes a post by URN", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "delete", "urn:li:share:123"]);

    expect(coreMock.deletePost).toHaveBeenCalledWith(expect.anything(), "urn:li:share:123");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("prompts for confirmation", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "delete", "urn:li:share:123"]);

    expect(confirmMock.confirmOrAbort).toHaveBeenCalledWith('Delete post "urn:li:share:123"?', false);
  });

  it("skips confirmation with --force", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "delete", "urn:li:share:123", "--force"]);

    expect(confirmMock.confirmOrAbort).toHaveBeenCalledWith('Delete post "urn:li:share:123"?', true);
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "delete", "urn:li:share:123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("urn", "urn:li:share:123");
    expect(parsed).toHaveProperty("status", "deleted");
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.deletePost).mockRejectedValueOnce(new LinkedInApiError("Not Found", 404));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "post", "delete", "urn:li:share:123", "--force"]),
    ).rejects.toThrow(/Failed to delete post/);
  });

  it("aborts when user declines confirmation", async () => {
    vi.mocked(confirmMock.confirmOrAbort).mockRejectedValueOnce(new Error("Aborted."));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "post", "delete", "urn:li:share:123"])).rejects.toThrow(
      /Aborted/,
    );

    expect(coreMock.deletePost).not.toHaveBeenCalled();
  });
});
