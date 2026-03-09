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
    getComment: vi.fn().mockResolvedValue({
      urn: "urn:li:comment:(urn:li:activity:100,200)",
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "A comment",
      createdAt: "2024-11-14T22:13:20.000Z",
    }),
  };
});

const coreMock = await import("@linkedctl/core");

describe("comment get", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(coreMock.resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    });
    vi.mocked(coreMock.getComment).mockResolvedValue({
      urn: "urn:li:comment:(urn:li:activity:100,200)",
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "A comment",
      createdAt: "2024-11-14T22:13:20.000Z",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gets a comment by URN", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "get", "urn:li:comment:(urn:li:activity:100,200)"]);

    expect(coreMock.getComment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        commentUrn: "urn:li:comment:(urn:li:activity:100,200)",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "comment",
      "get",
      "urn:li:comment:(urn:li:activity:100,200)",
      "--format",
      "json",
    ]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toEqual(
      expect.objectContaining({
        urn: "urn:li:comment:(urn:li:activity:100,200)",
        actor: "urn:li:person:abc",
        message: "A comment",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.getComment).mockRejectedValueOnce(new LinkedInApiError("Not Found", 404));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "comment", "get", "urn:li:comment:(urn:li:activity:100,200)"]),
    ).rejects.toThrow(/Failed to get comment/);
  });
});
