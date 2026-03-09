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
    listComments: vi.fn().mockResolvedValue([]),
  };
});

const coreMock = await import("@linkedctl/core");

describe("comment list", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists comments on a post", async () => {
    vi.mocked(coreMock.listComments).mockResolvedValue([
      {
        urn: "urn:li:comment:(urn:li:activity:100,200)",
        actor: "urn:li:person:abc",
        object: "urn:li:share:123",
        message: "Great post!",
        createdAt: "2024-11-14T22:13:20.000Z",
      },
    ]);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "list", "urn:li:share:123"]);

    expect(coreMock.listComments).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ object: "urn:li:share:123" }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    vi.mocked(coreMock.listComments).mockResolvedValue([
      {
        urn: "urn:li:comment:(urn:li:activity:100,200)",
        actor: "urn:li:person:abc",
        object: "urn:li:share:123",
        message: "Nice!",
        createdAt: "2024-11-14T22:13:20.000Z",
      },
    ]);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "list", "urn:li:share:123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as unknown[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(
      expect.objectContaining({
        urn: "urn:li:comment:(urn:li:activity:100,200)",
        message: "Nice!",
      }),
    );
  });

  it("outputs empty result when no comments exist", async () => {
    vi.mocked(coreMock.listComments).mockResolvedValue([]);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "list", "urn:li:share:123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual([]);
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.listComments).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "comment", "list", "urn:li:share:123"])).rejects.toThrow(
      /Failed to list comments/,
    );
  });
});
