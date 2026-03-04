// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveConfig, ConfigError } from "./resolve.js";

function tempDir(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`);
}

describe("resolveConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("resolves config from home file", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "my-token"
api-version: "202501"
`,
    );

    const { config, warnings } = await resolveConfig({ home: dir, cwd: dir, env: {} });
    expect(config.oauth?.accessToken).toBe("my-token");
    expect(config.apiVersion).toBe("202501");
    expect(warnings).toEqual([]);
  });

  it("resolves config from CWD file", async () => {
    const cwd = join(dir, "project");
    const home = join(dir, "home");
    await mkdir(cwd, { recursive: true });
    await mkdir(home, { recursive: true });
    await writeFile(
      join(cwd, ".linkedctl.yaml"),
      `oauth:
  access-token: "cwd-token"
api-version: "202501"
`,
    );

    const { config } = await resolveConfig({ home, cwd, env: {} });
    expect(config.oauth?.accessToken).toBe("cwd-token");
  });

  it("resolves config from profile-specific file", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "work.yaml"),
      `oauth:
  access-token: "work-token"
api-version: "202501"
`,
    );

    const { config } = await resolveConfig({ profile: "work", home: dir, env: {} });
    expect(config.oauth?.accessToken).toBe("work-token");
  });

  it("env vars override file values", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "file-token"
api-version: "202501"
`,
    );

    const { config } = await resolveConfig({
      home: dir,
      cwd: dir,
      env: { LINKEDCTL_ACCESS_TOKEN: "env-token", LINKEDCTL_API_VERSION: "202502" },
    });
    expect(config.oauth?.accessToken).toBe("env-token");
    expect(config.apiVersion).toBe("202502");
  });

  it("profile-specific env vars override file values", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "work.yaml"),
      `oauth:
  access-token: "file-token"
api-version: "202501"
`,
    );

    const { config } = await resolveConfig({
      profile: "work",
      home: dir,
      env: { LINKEDCTL_WORK_ACCESS_TOKEN: "env-token" },
    });
    expect(config.oauth?.accessToken).toBe("env-token");
  });

  it("throws ConfigError when access token is missing", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".linkedctl.yaml"), 'api-version: "202501"\n');

    await expect(resolveConfig({ home: dir, cwd: dir, env: {} })).rejects.toThrow(ConfigError);
    await expect(resolveConfig({ home: dir, cwd: dir, env: {} })).rejects.toThrow(/No access token configured/);
  });

  it("throws ConfigError when api-version is missing", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "tok"
`,
    );

    await expect(resolveConfig({ home: dir, cwd: dir, env: {} })).rejects.toThrow(/No API version configured/);
  });

  it("throws ConfigError on validation errors", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".linkedctl.yaml"), "- not\n- a\n- mapping\n");

    await expect(resolveConfig({ home: dir, cwd: dir, env: {} })).rejects.toThrow(ConfigError);
    await expect(resolveConfig({ home: dir, cwd: dir, env: {} })).rejects.toThrow(/validation failed/);
  });

  it("works with no config file when env vars provide credentials", async () => {
    const { config } = await resolveConfig({
      home: dir,
      cwd: dir,
      env: { LINKEDCTL_ACCESS_TOKEN: "env-tok", LINKEDCTL_API_VERSION: "202501" },
    });
    expect(config.oauth?.accessToken).toBe("env-tok");
    expect(config.apiVersion).toBe("202501");
  });

  it("throws ConfigError when required scopes are missing", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "tok"
  scope: "openid profile"
api-version: "202501"
`,
    );

    await expect(
      resolveConfig({ home: dir, cwd: dir, env: {}, requiredScopes: ["openid", "profile", "email"] }),
    ).rejects.toThrow(/Missing required OAuth scopes: email/);
  });

  it("passes when all required scopes are present", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "tok"
  scope: "openid profile email"
api-version: "202501"
`,
    );

    const { config } = await resolveConfig({
      home: dir,
      cwd: dir,
      env: {},
      requiredScopes: ["openid", "profile", "email"],
    });
    expect(config.oauth?.accessToken).toBe("tok");
  });

  it("skips scope validation when scope field is not set", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "tok"
api-version: "202501"
`,
    );

    const { config } = await resolveConfig({
      home: dir,
      cwd: dir,
      env: {},
      requiredScopes: ["openid", "profile", "email"],
    });
    expect(config.oauth?.accessToken).toBe("tok");
  });

  it("returns warnings for unknown keys", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "tok"
api-version: "202501"
unknown-field: "val"
`,
    );

    const { warnings } = await resolveConfig({ home: dir, cwd: dir, env: {} });
    expect(warnings).toEqual([expect.stringContaining("unknown-field")]);
  });

  it("throws when access token is empty string", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: ""
api-version: "202501"
`,
    );

    await expect(resolveConfig({ home: dir, cwd: dir, env: {} })).rejects.toThrow(/No access token configured/);
  });
});
