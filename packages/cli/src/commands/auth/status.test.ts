// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { statusCommand } from "./status.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

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
  let configPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    configPath = tempConfigPath();
    vi.spyOn(configFile, "getDefaultConfigPath").mockReturnValue(configPath);
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(join(configPath, ".."), { recursive: true, force: true });
  });

  it("shows not configured when profile does not exist", async () => {
    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: default");
    expect(consoleSpy).toHaveBeenCalledWith("Status: not configured");
    expect(consoleSpy).toHaveBeenCalledWith('Run "linkedctl profile create" to set up authentication.');
  });

  it("shows not configured when access token is empty", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: { personal: { "access-token": "", "api-version": "202501" } },
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: personal");
    expect(consoleSpy).toHaveBeenCalledWith("Status: not configured");
  });

  it("shows authenticated with expiry for valid JWT token", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400 * 3; // 3 days
    const token = buildJwt({ exp: futureExp, sub: "user" });

    await writeConfigFile(configPath, {
      "default-profile": "work",
      profiles: { work: { "access-token": token, "api-version": "202501" } },
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: work");
    expect(consoleSpy).toHaveBeenCalledWith("Status: authenticated");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("remaining)"));
  });

  it("shows expired status with guidance for expired JWT", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = buildJwt({ exp: pastExp });

    await writeConfigFile(configPath, {
      "default-profile": "expired",
      profiles: { expired: { "access-token": token, "api-version": "202501" } },
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: expired");
    expect(consoleSpy).toHaveBeenCalledWith("Status: expired");
    expect(consoleSpy).toHaveBeenCalledWith(
      'Run "linkedctl profile create" with a new --access-token to re-authenticate.',
    );
  });

  it("shows authenticated with unknown expiry for opaque token", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "opaque",
      profiles: { opaque: { "access-token": "AQVh7cKZopaque", "api-version": "202501" } },
    });

    const cmd = statusCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: opaque");
    expect(consoleSpy).toHaveBeenCalledWith("Status: authenticated");
    expect(consoleSpy).toHaveBeenCalledWith("Expiry: unknown (token is not a JWT)");
  });
});
