// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { listCommand } from "./list.js";

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    homedir: vi.fn().mockReturnValue("/mock/home"),
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readdir: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

const { homedir } = await import("node:os");
const { readdir } = await import("node:fs/promises");

/**
 * Build a minimal JWT with the given payload claims.
 */
function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "fake-signature";
  return `${header}.${body}.${signature}`;
}

describe("profile list", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(homedir).mockReturnValue("/mock/home");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows message when config dir does not exist", async () => {
    const enoent = new Error("ENOENT") as NodeJS.ErrnoException;
    enoent.code = "ENOENT";
    vi.mocked(readdir).mockRejectedValue(enoent);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("No profiles configured.");
  });

  it("shows message when no yaml files exist", async () => {
    vi.mocked(readdir).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("No profiles configured.");
  });

  it("ignores non-yaml files", async () => {
    vi.mocked(readdir).mockResolvedValue(["notes.txt", ".DS_Store"] as unknown as Awaited<ReturnType<typeof readdir>>);

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("No profiles configured.");
  });

  it("re-throws unexpected filesystem errors", async () => {
    const ioError = new Error("I/O error") as NodeJS.ErrnoException;
    ioError.code = "EIO";
    vi.mocked(readdir).mockRejectedValue(ioError);

    const cmd = listCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/I\/O error/);
  });

  it("shows not configured for profile without config file", async () => {
    vi.mocked(readdir).mockResolvedValue(["test.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({ raw: undefined, path: undefined });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as unknown[];
    expect(output).toEqual([{ name: "test", status: "not configured" }]);
  });

  it("shows not configured when access token is missing", async () => {
    vi.mocked(readdir).mockResolvedValue(["work.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { oauth: { "client-id": "abc" } },
      path: "/mock/home/.linkedctl/work.yaml",
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as unknown[];
    expect(output).toEqual([{ name: "work", status: "not configured" }]);
  });

  it("shows authenticated for valid JWT token", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400 * 45; // 45 days
    const token = buildJwt({ exp: futureExp, sub: "user" });

    vi.mocked(readdir).mockResolvedValue(["personal.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { oauth: { "access-token": token } },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>[];
    expect(output).toHaveLength(1);
    expect(output).toEqual([
      expect.objectContaining({
        name: "personal",
        status: "authenticated",
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as unknown,
        expires: expect.stringMatching(/^in \d+d/) as unknown,
      }),
    ]);
  });

  it("shows expired for expired JWT token", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 86400 * 3; // 3 days ago
    const token = buildJwt({ exp: pastExp });

    vi.mocked(readdir).mockResolvedValue(["work.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { oauth: { "access-token": token } },
      path: "/mock/home/.linkedctl/work.yaml",
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>[];
    expect(output).toHaveLength(1);
    expect(output).toEqual([
      expect.objectContaining({
        name: "work",
        status: "expired",
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as unknown,
        expires: expect.stringMatching(/\d+d ago$/) as unknown,
      }),
    ]);
  });

  it("shows authenticated without expiry for opaque token", async () => {
    vi.mocked(readdir).mockResolvedValue(["dev.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { oauth: { "access-token": "AQVh7cKZopaque" } },
      path: "/mock/home/.linkedctl/dev.yaml",
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as unknown[];
    expect(output).toEqual([{ name: "dev", status: "authenticated" }]);
  });

  it("lists multiple profiles with mixed statuses", async () => {
    const validToken = buildJwt({ exp: Math.floor(Date.now() / 1000) + 86400 * 10 });
    const expiredToken = buildJwt({ exp: Math.floor(Date.now() / 1000) - 86400 });

    vi.mocked(readdir).mockResolvedValue(["personal.yaml", "work.yaml", "test.yaml"] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);
    vi.spyOn(core, "loadConfigFile").mockImplementation(async (options) => {
      const profile = options?.profile;
      if (profile === "personal") {
        return { raw: { oauth: { "access-token": validToken } }, path: `/mock/home/.linkedctl/${profile}.yaml` };
      }
      if (profile === "work") {
        return { raw: { oauth: { "access-token": expiredToken } }, path: `/mock/home/.linkedctl/${profile}.yaml` };
      }
      return { raw: undefined, path: undefined };
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>[];
    expect(output).toHaveLength(3);
    expect(output).toEqual([
      expect.objectContaining({ name: "personal", status: "authenticated" }),
      expect.objectContaining({ name: "work", status: "expired" }),
      expect.objectContaining({ name: "test", status: "not configured" }),
    ]);
  });

  it("outputs table format with name, status, and expires columns", async () => {
    const validToken = buildJwt({ exp: Math.floor(Date.now() / 1000) + 86400 * 45 });

    vi.mocked(readdir).mockResolvedValue(["personal.yaml", "test.yaml"] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);
    vi.spyOn(core, "loadConfigFile").mockImplementation(async (options) => {
      if (options?.profile === "personal") {
        return { raw: { oauth: { "access-token": validToken } }, path: "/mock/home/.linkedctl/personal.yaml" };
      }
      return { raw: undefined, path: undefined };
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const lines = output.split("\n");
    // Header line should have column names
    expect(lines[0]).toMatch(/name\s+status\s+expires/);
    // Separator line
    expect(lines[1]).toMatch(/─+/);
    // Data lines
    expect(lines[2]).toMatch(/personal\s+authenticated\s+in \d+d/);
    expect(lines[3]).toMatch(/test\s+not configured/);
  });

  it("excludes expiresAt from table format", async () => {
    const validToken = buildJwt({ exp: Math.floor(Date.now() / 1000) + 86400 });

    vi.mocked(readdir).mockResolvedValue(["p.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { oauth: { "access-token": validToken } },
      path: "/mock/home/.linkedctl/p.yaml",
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).not.toContain("expiresAt");
  });

  it("includes expiresAt in json format", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400;
    const token = buildJwt({ exp: futureExp });

    vi.mocked(readdir).mockResolvedValue(["p.yaml"] as unknown as Awaited<ReturnType<typeof readdir>>);
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { oauth: { "access-token": token } },
      path: "/mock/home/.linkedctl/p.yaml",
    });

    const cmd = listCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>[];
    expect(output).toEqual([
      expect.objectContaining({
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as unknown,
      }),
    ]);
  });
});
