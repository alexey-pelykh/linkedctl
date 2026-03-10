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
    deleteComment: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../../confirm.js", () => ({
  confirmOrAbort: vi.fn().mockResolvedValue(undefined),
}));

const coreMock = await import("@linkedctl/core");
const confirmMock = await import("../../confirm.js");

describe("comment delete", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes a comment by URN", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "delete", "urn:li:comment:(urn:li:activity:100,200)"]);

    expect(coreMock.deleteComment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        commentUrn: "urn:li:comment:(urn:li:activity:100,200)",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith("Comment deleted.");
  });

  it("prompts for confirmation", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "delete", "urn:li:comment:(urn:li:activity:100,200)"]);

    expect(confirmMock.confirmOrAbort).toHaveBeenCalledWith(
      'Delete comment "urn:li:comment:(urn:li:activity:100,200)"?',
      false,
    );
  });

  it("skips confirmation with --force", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "comment",
      "delete",
      "urn:li:comment:(urn:li:activity:100,200)",
      "--force",
    ]);

    expect(confirmMock.confirmOrAbort).toHaveBeenCalledWith(
      'Delete comment "urn:li:comment:(urn:li:activity:100,200)"?',
      true,
    );
  });

  it("aborts when user declines confirmation", async () => {
    vi.mocked(confirmMock.confirmOrAbort).mockRejectedValueOnce(new Error("Aborted."));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "comment", "delete", "urn:li:comment:(urn:li:activity:100,200)"]),
    ).rejects.toThrow(/Aborted/);

    expect(coreMock.deleteComment).not.toHaveBeenCalled();
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.deleteComment).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "comment", "delete", "urn:li:comment:(urn:li:activity:100,200)"]),
    ).rejects.toThrow(/Failed to delete comment/);
  });
});
