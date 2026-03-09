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
    deleteReaction: vi.fn().mockResolvedValue(undefined),
  };
});

const coreMock = await import("@linkedctl/core");

describe("reaction delete", () => {
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
    vi.mocked(coreMock.deleteReaction).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes the user's reaction from a post", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "delete", "urn:li:share:abc123"]);

    expect(coreMock.deleteReaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "urn:li:share:abc123",
        actor: "urn:li:person:person123",
      }),
    );
  });

  it("uses organization URN as actor when --as-org is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "delete", "urn:li:share:abc123", "--as-org", "99999"]);

    expect(coreMock.getCurrentPersonUrn).not.toHaveBeenCalled();
    expect(coreMock.deleteReaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "urn:li:share:abc123",
        actor: "urn:li:organization:99999",
      }),
    );
  });

  it("outputs confirmation message", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "reaction", "delete", "urn:li:share:abc123"]);

    expect(consoleSpy).toHaveBeenCalledWith("Reaction deleted");
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "reaction", "delete", "urn:li:share:abc123"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.deleteReaction).mockRejectedValueOnce(new LinkedInApiError("Not Found", 404));

    const program = createProgram();
    program.exitOverride();

    await expect(
      program.parseAsync(["node", "linkedctl", "reaction", "delete", "urn:li:share:abc123"]),
    ).rejects.toThrow(/Failed to delete reaction/);
  });
});
