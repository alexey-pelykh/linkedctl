// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { statusCommand } from "./status.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

/**
 * Build a minimal JWT with the given payload claims.
 */
function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "fake-signature";
  return `${header}.${body}.${signature}`;
}

describe("auth status", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows not configured when config file does not exist", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: undefined,
      path: undefined,
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("default");
    expect(output).toContain("not configured");
    expect(consoleErrorSpy).toHaveBeenCalledWith('Run "linkedctl auth login" to set up authentication.');
  });

  it("shows not configured when access token is empty", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": "" },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("default");
    expect(output).toContain("not configured");
    expect(consoleErrorSpy).toHaveBeenCalledWith('Run "linkedctl auth login" to set up authentication.');
  });

  it("shows authenticated with expiry for valid JWT token", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400 * 3; // 3 days
    const token = buildJwt({ exp: futureExp, sub: "user" });

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": token },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("authenticated");
    expect(output).toContain("remaining)");
  });

  it("shows expired status with guidance for expired JWT", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = buildJwt({ exp: pastExp });

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": token },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("expired");
    expect(consoleErrorSpy).toHaveBeenCalledWith('Run "linkedctl auth login" to re-authenticate.');
  });

  it("shows authenticated with unknown expiry for opaque token", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": "AQVh7cKZopaque" },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("authenticated");
    expect(output).toContain("unknown (token is not a JWT)");
  });

  it("outputs JSON when --format json is specified for not configured", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: undefined,
      path: undefined,
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "default",
      status: "not configured",
      expiresAt: null,
      remainingSeconds: null,
    });
  });

  it("outputs JSON when --format json is specified for valid JWT", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400 * 3;
    const token = buildJwt({ exp: futureExp, sub: "user" });

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": token },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "default",
      status: "authenticated",
      expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as unknown,
      remainingSeconds: expect.any(Number) as unknown,
    });
    expect(parsed["remainingSeconds"]).toBeGreaterThan(0);
  });

  it("outputs JSON when --format json is specified for expired JWT", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = buildJwt({ exp: pastExp });

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": token },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "default",
      status: "expired",
      expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) as unknown,
      remainingSeconds: 0,
    });
  });

  it("outputs JSON when --format json is specified for opaque token", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": "AQVh7cKZopaque" },
        "api-version": "202601",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "default",
      status: "authenticated",
      expiresAt: null,
      remainingSeconds: null,
    });
  });

  it("rejects invalid --format value", async () => {
    const cmd = statusCommand();
    cmd.exitOverride();

    await expect(cmd.parseAsync(["--format", "xml"], { from: "user" })).rejects.toThrow(
      /Allowed choices are json, table/,
    );
  });
});
