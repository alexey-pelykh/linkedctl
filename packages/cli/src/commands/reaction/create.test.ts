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
    createReaction: vi.fn().mockResolvedValue("urn:li:reaction:test123"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("reaction create", () => {
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
    vi.mocked(coreMock.createReaction).mockResolvedValue("urn:li:reaction:test123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a LIKE reaction by default", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "create", "urn:li:share:abc123"]);

    expect(coreMock.createReaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "urn:li:share:abc123",
        reactionType: "LIKE",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("creates a reaction with specified type", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "create", "urn:li:share:abc123", "--type", "PRAISE"]);

    expect(coreMock.createReaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "urn:li:share:abc123",
        reactionType: "PRAISE",
      }),
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "create", "urn:li:share:abc123", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:reaction:test123" });
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "reaction", "create", "urn:li:share:abc123"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("passes organization actor when --as-org is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "create", "urn:li:share:abc123", "--as-org", "99999"]);

    expect(coreMock.createReaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "urn:li:share:abc123",
        reactionType: "LIKE",
        actor: "urn:li:organization:99999",
      }),
    );
  });

  it("rejects invalid --type value", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "reaction", "create", "urn:li:share:abc123", "--type", "INVALID"]),
    ).rejects.toThrow(/Allowed choices are/);
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.createReaction).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "reaction", "create", "urn:li:share:abc123"]),
    ).rejects.toThrow(/Failed to create reaction/);
  });
});
