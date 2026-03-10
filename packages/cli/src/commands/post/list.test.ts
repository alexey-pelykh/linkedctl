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
    listOrganizations: vi.fn().mockResolvedValue({
      elements: [],
      paging: { count: 100, start: 0 },
    }),
    listPosts: vi.fn().mockResolvedValue({
      elements: [
        {
          id: "urn:li:share:111",
          author: "urn:li:person:person123",
          commentary: "First post",
          visibility: "PUBLIC",
          lifecycleState: "PUBLISHED",
          distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
          isReshareDisabledByAuthor: false,
        },
        {
          id: "urn:li:share:222",
          author: "urn:li:person:person123",
          commentary: "Second post",
          visibility: "CONNECTIONS",
          lifecycleState: "PUBLISHED",
          distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
          isReshareDisabledByAuthor: false,
        },
      ],
      paging: { count: 10, start: 0, total: 2 },
    }),
  };
});

const coreMock = await import("@linkedctl/core");

describe("post list", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists posts for the current user", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "list"]);

    expect(coreMock.getCurrentPersonUrn).toHaveBeenCalled();
    expect(coreMock.listPosts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        author: "urn:li:person:person123",
        count: 10,
        start: 0,
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("passes custom count and start options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "list", "--count", "5", "--start", "10"]);

    expect(coreMock.listPosts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        count: 5,
        start: 10,
      }),
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "list", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("elements");
    expect(parsed).toHaveProperty("paging");
  });

  it("shows message when no posts found in table mode", async () => {
    vi.mocked(coreMock.listPosts).mockResolvedValueOnce({
      elements: [],
      paging: { count: 10, start: 0 },
    });

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "list", "--format", "table"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toBe("No posts found.");
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.listPosts).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "post", "list"])).rejects.toThrow(/Failed to list posts/);
  });

  describe("--as-org", () => {
    it("lists posts as organization", async () => {
      vi.mocked(coreMock.listOrganizations).mockResolvedValueOnce({
        elements: [{ organization: "urn:li:organization:98765", role: "ADMINISTRATOR", state: "APPROVED" }],
        paging: { count: 100, start: 0 },
      });

      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "list", "--as-org", "98765"]);

      expect(coreMock.listPosts).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          author: "urn:li:organization:98765",
        }),
      );
      expect(coreMock.getCurrentPersonUrn).not.toHaveBeenCalled();
    });

    it("requires r_organization_social scope when --as-org is used", async () => {
      vi.mocked(coreMock.listOrganizations).mockResolvedValueOnce({
        elements: [{ organization: "urn:li:organization:98765", role: "ADMINISTRATOR", state: "APPROVED" }],
        paging: { count: 100, start: 0 },
      });

      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "list", "--as-org", "98765"]);

      expect(coreMock.resolveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredScopes: expect.arrayContaining(["r_organization_social"]),
        }),
      );
    });

    it("does not require r_organization_social scope for personal listing", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "list"]);

      expect(coreMock.resolveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredScopes: expect.not.arrayContaining(["r_organization_social"]),
        }),
      );
    });

    it("rejects --as-org when user is not an administrator", async () => {
      vi.mocked(coreMock.listOrganizations).mockResolvedValueOnce({
        elements: [],
        paging: { count: 100, start: 0 },
      });

      const program = createProgram();
      program.exitOverride();

      await expect(program.parseAsync(["node", "linkedctl", "post", "list", "--as-org", "99999"])).rejects.toThrow(
        /not an administrator of organization 99999/,
      );
    });
  });
});
