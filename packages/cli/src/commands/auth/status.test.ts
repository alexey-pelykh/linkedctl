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

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
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
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: default");
    expect(consoleSpy).toHaveBeenCalledWith("Status: not configured");
  });

  it("shows not configured when access token is empty", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": "" },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: default");
    expect(consoleSpy).toHaveBeenCalledWith("Status: not configured");
  });

  it("shows authenticated with expiry for valid JWT token", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400 * 3; // 3 days
    const token = buildJwt({ exp: futureExp, sub: "user" });

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": token },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: default");
    expect(consoleSpy).toHaveBeenCalledWith("Status: authenticated");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("remaining)"));
  });

  it("shows expired status with guidance for expired JWT", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = buildJwt({ exp: pastExp });

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": token },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: default");
    expect(consoleSpy).toHaveBeenCalledWith("Status: expired");
  });

  it("shows authenticated with unknown expiry for opaque token", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": "AQVh7cKZopaque" },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: default");
    expect(consoleSpy).toHaveBeenCalledWith("Status: authenticated");
    expect(consoleSpy).toHaveBeenCalledWith("Expiry: unknown (token is not a JWT)");
  });
});
