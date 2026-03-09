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

const coreMock = await import("@linkedctl/core");

describe("comment delete", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(coreMock.resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    });
    vi.mocked(coreMock.deleteComment).mockResolvedValue(undefined);
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
    expect(consoleErrorSpy).toHaveBeenCalledWith("Comment deleted.");
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
