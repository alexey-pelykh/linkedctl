// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, afterEach } from "vitest";
import { resolveConfig } from "./config-resolver.js";
import { writeConfigFile } from "./config-file.js";
import type { ConfigFile } from "./types.js";

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("resolveConfig", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const p of cleanupPaths) {
      await rm(p, { recursive: true, force: true });
    }
    cleanupPaths.length = 0;
  });

  async function setupConfig(config: ConfigFile): Promise<string> {
    const path = tempConfigPath();
    cleanupPaths.push(join(path, ".."));
    await writeConfigFile(path, config);
    return path;
  }

  it("resolves from config file profile", async () => {
    const path = await setupConfig({
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "file-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig({}, {}, path);
    expect(result.accessToken).toBe("file-token");
    expect(result.apiVersion).toBe("202501");
    expect(result.profile).toBe("personal");
  });

  it("env vars override config file values", async () => {
    const path = await setupConfig({
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "file-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig(
      {},
      { LINKEDCTL_ACCESS_TOKEN: "env-token", LINKEDCTL_API_VERSION: "202502" },
      path,
    );
    expect(result.accessToken).toBe("env-token");
    expect(result.apiVersion).toBe("202502");
  });

  it("CLI flags override env vars and config", async () => {
    const path = await setupConfig({
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "file-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig(
      { accessToken: "cli-token", apiVersion: "202503" },
      { LINKEDCTL_ACCESS_TOKEN: "env-token" },
      path,
    );
    expect(result.accessToken).toBe("cli-token");
    expect(result.apiVersion).toBe("202503");
  });

  it("--profile CLI flag selects a specific profile", async () => {
    const path = await setupConfig({
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "personal-token", "api-version": "202501" },
        work: { "access-token": "work-token", "api-version": "202502" },
      },
    });

    const result = await resolveConfig({ profile: "work" }, {}, path);
    expect(result.accessToken).toBe("work-token");
    expect(result.apiVersion).toBe("202502");
    expect(result.profile).toBe("work");
  });

  it("LINKEDCTL_PROFILE env var selects profile", async () => {
    const path = await setupConfig({
      profiles: {
        work: { "access-token": "work-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig({}, { LINKEDCTL_PROFILE: "work" }, path);
    expect(result.accessToken).toBe("work-token");
    expect(result.profile).toBe("work");
  });

  it("CLI --profile overrides LINKEDCTL_PROFILE env var", async () => {
    const path = await setupConfig({
      profiles: {
        personal: { "access-token": "personal-token", "api-version": "202501" },
        work: { "access-token": "work-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig({ profile: "personal" }, { LINKEDCTL_PROFILE: "work" }, path);
    expect(result.accessToken).toBe("personal-token");
    expect(result.profile).toBe("personal");
  });

  it("LINKEDCTL_ACCESS_TOKEN overrides profile token", async () => {
    const path = await setupConfig({
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "file-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig({}, { LINKEDCTL_ACCESS_TOKEN: "env-override" }, path);
    expect(result.accessToken).toBe("env-override");
    expect(result.apiVersion).toBe("202501");
  });

  it("falls back to 'default' profile name when none specified", async () => {
    const path = await setupConfig({
      profiles: {
        default: { "access-token": "default-token", "api-version": "202501" },
      },
    });

    const result = await resolveConfig({}, {}, path);
    expect(result.accessToken).toBe("default-token");
    expect(result.profile).toBe("default");
  });

  it("rejects empty string access token", async () => {
    const path = tempConfigPath();
    cleanupPaths.push(join(path, ".."));

    await expect(resolveConfig({ accessToken: "" }, {}, path)).rejects.toThrow(/No access token configured/);
  });

  it("throws when access token cannot be resolved", async () => {
    const path = tempConfigPath();
    cleanupPaths.push(join(path, ".."));

    await expect(resolveConfig({}, {}, path)).rejects.toThrow(/No access token configured/);
  });

  it("throws when api version cannot be resolved", async () => {
    const path = tempConfigPath();
    cleanupPaths.push(join(path, ".."));

    await expect(resolveConfig({ accessToken: "tok" }, {}, path)).rejects.toThrow(/No API version configured/);
  });

  it("works with no config file at all", async () => {
    const result = await resolveConfig(
      { accessToken: "cli-tok", apiVersion: "202501" },
      {},
      "/nonexistent/.linkedctl.yaml",
    );
    expect(result.accessToken).toBe("cli-tok");
    expect(result.apiVersion).toBe("202501");
    expect(result.profile).toBe("default");
  });
});
