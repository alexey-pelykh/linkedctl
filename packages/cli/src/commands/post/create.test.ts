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
        apiVersion: "202501",
      },
      warnings: [],
    }),
    getCurrentPersonUrn: vi.fn().mockResolvedValue("urn:li:person:person123"),
    createTextPost: vi.fn().mockResolvedValue("urn:li:share:111222333"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("post create", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(coreMock.resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202501",
      },
      warnings: [],
    });
    vi.mocked(coreMock.createTextPost).mockResolvedValue("urn:li:share:111222333");
    vi.mocked(coreMock.getCurrentPersonUrn).mockResolvedValue("urn:li:person:person123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a post with --text option", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello LinkedIn"]);

    expect(coreMock.createTextPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        author: "urn:li:person:person123",
        text: "Hello LinkedIn",
        visibility: "PUBLIC",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("creates a post with shorthand: linkedctl post 'Hello'", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "Hello from shorthand"]);

    expect(coreMock.createTextPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Hello from shorthand",
      }),
    );
  });

  it("uses CONNECTIONS visibility when specified", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "post",
      "create",
      "--text",
      "Private post",
      "--visibility",
      "CONNECTIONS",
    ]);

    expect(coreMock.createTextPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "CONNECTIONS",
      }),
    );
  });

  it("defaults visibility to PUBLIC", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Public post"]);

    expect(coreMock.createTextPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "PUBLIC",
      }),
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:share:111222333" });
  });

  it("outputs post URN in the result", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("urn:li:share:111222333");
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "post", "create", "--text", "Hello"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("rejects invalid --visibility value", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--visibility", "PRIVATE"]),
    ).rejects.toThrow(/Allowed choices are PUBLIC, CONNECTIONS/);
  });

  it("rejects invalid --format value on post create", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--format", "xml"]),
    ).rejects.toThrow(/Allowed choices are json, table/);
  });

  it("rejects invalid --format value on post shorthand", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(program.parseAsync(["node", "linkedctl", "post", "Hello", "--format", "xml"])).rejects.toThrow(
      /Allowed choices are json, table/,
    );
  });

  it("creates a post with positional argument on post create", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "Hello positional"]);

    expect(coreMock.createTextPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Hello positional",
      }),
    );
  });

  it("--text takes precedence over positional argument on post create", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "positional", "--text", "from option"]);

    expect(coreMock.createTextPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "from option",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.createTextPost).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello"])).rejects.toThrow(
      /Failed to create post/,
    );
  });
});
