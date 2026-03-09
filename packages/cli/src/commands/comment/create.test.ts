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
    getCurrentPersonUrn: vi.fn().mockResolvedValue("urn:li:person:person123"),
    createComment: vi.fn().mockResolvedValue("urn:li:comment:(urn:li:activity:100,200)"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("comment create", () => {
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
    vi.mocked(coreMock.getCurrentPersonUrn).mockResolvedValue("urn:li:person:person123");
    vi.mocked(coreMock.createComment).mockResolvedValue("urn:li:comment:(urn:li:activity:100,200)");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a comment with --text option", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "comment", "create", "urn:li:share:123", "--text", "Great post!"]);

    expect(coreMock.createComment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actor: "urn:li:person:person123",
        object: "urn:li:share:123",
        message: "Great post!",
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
      "create",
      "urn:li:share:123",
      "--text",
      "Nice!",
      "--format",
      "json",
    ]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:comment:(urn:li:activity:100,200)" });
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "--profile",
      "work",
      "comment",
      "create",
      "urn:li:share:123",
      "--text",
      "Hello",
    ]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.createComment).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "comment", "create", "urn:li:share:123", "--text", "Hello"]),
    ).rejects.toThrow(/Failed to create comment/);
  });
});
