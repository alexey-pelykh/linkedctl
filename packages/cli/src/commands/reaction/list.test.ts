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
    listReactions: vi.fn().mockResolvedValue([]),
  };
});

const coreMock = await import("@linkedctl/core");

describe("reaction list", () => {
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
    vi.mocked(coreMock.listReactions).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists reactions for a post", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "list", "urn:li:share:abc123"]);

    expect(coreMock.listReactions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "urn:li:share:abc123",
      }),
    );
  });

  it("outputs reactions as JSON when --format json is specified", async () => {
    vi.mocked(coreMock.listReactions).mockResolvedValue([
      {
        actor: "urn:li:person:user1",
        entity: "urn:li:share:abc123",
        reactionType: "LIKE",
        createdAt: 1700000000000,
      },
    ]);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "list", "urn:li:share:abc123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveProperty("actor", "urn:li:person:user1");
    expect(parsed[0]).toHaveProperty("type", "LIKE");
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "reaction", "list", "urn:li:share:abc123"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.listReactions).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "reaction", "list", "urn:li:share:abc123"])).rejects.toThrow(
      /Failed to list reactions/,
    );
  });
});
