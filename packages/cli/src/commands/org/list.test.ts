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
    listOrganizations: vi.fn().mockResolvedValue({
      elements: [
        { organization: "urn:li:organization:123", role: "ADMINISTRATOR", state: "APPROVED" },
        { organization: "urn:li:organization:456", role: "ADMINISTRATOR", state: "APPROVED" },
      ],
      paging: { count: 10, start: 0, total: 2 },
    }),
  };
});

const coreMock = await import("@linkedctl/core");

describe("org list", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists administered organizations", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "org", "list"]);

    expect(coreMock.listOrganizations).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        count: 10,
        start: 0,
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("passes custom count and start options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "org", "list", "--count", "5", "--start", "10"]);

    expect(coreMock.listOrganizations).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        count: 5,
        start: 10,
      }),
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "org", "list", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("elements");
    expect(parsed).toHaveProperty("paging");
  });

  it("shows message when no organizations found in table mode", async () => {
    vi.mocked(coreMock.listOrganizations).mockResolvedValueOnce({
      elements: [],
      paging: { count: 10, start: 0 },
    });

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "org", "list", "--format", "table"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toBe("No organizations found.");
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.listOrganizations).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "org", "list"])).rejects.toThrow(
      /Failed to list organizations/,
    );
  });
});
