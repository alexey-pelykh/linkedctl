// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { listProfileScopes, findProfilesWithScopes } from "./profiles.js";

function tempDir(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`);
}

describe("listProfileScopes", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns empty array when no profile directory exists", async () => {
    const result = await listProfileScopes({ home: dir });
    expect(result).toEqual([]);
  });

  it("lists profiles with their scopes", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "work.yaml"),
      `oauth:
  scope: "openid profile w_member_social"
`,
    );
    await writeFile(
      join(profileDir, "analytics.yaml"),
      `oauth:
  scope: "r_member_postAnalytics"
`,
    );

    const result = await listProfileScopes({ home: dir });
    expect(result).toHaveLength(2);

    const work = result.find((p) => p.name === "work");
    expect(work?.scope).toBe("openid profile w_member_social");

    const analytics = result.find((p) => p.name === "analytics");
    expect(analytics?.scope).toBe("r_member_postAnalytics");
  });

  it("includes profiles without scope configured", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "empty.yaml"),
      `oauth:
  client-id: "test"
`,
    );

    const result = await listProfileScopes({ home: dir });
    expect(result).toHaveLength(1);
    expect(result[0]?.scope).toBeUndefined();
  });

  it("skips non-yaml files", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(join(profileDir, "notes.txt"), "not a profile");
    await writeFile(
      join(profileDir, "work.yaml"),
      `oauth:
  scope: "openid"
`,
    );

    const result = await listProfileScopes({ home: dir });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("work");
  });
});

describe("findProfilesWithScopes", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("finds profiles that have all required scopes", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "full.yaml"),
      `oauth:
  scope: "openid profile email w_member_social"
`,
    );
    await writeFile(
      join(profileDir, "minimal.yaml"),
      `oauth:
  scope: "openid profile"
`,
    );

    const result = await findProfilesWithScopes(["openid", "profile", "w_member_social"], { home: dir });
    expect(result).toEqual(["full"]);
  });

  it("excludes specified profile", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "work.yaml"),
      `oauth:
  scope: "openid profile w_member_social"
`,
    );

    const result = await findProfilesWithScopes(["openid", "profile", "w_member_social"], {
      home: dir,
      excludeProfile: "work",
    });
    expect(result).toEqual([]);
  });

  it("returns empty when no profiles match", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "basic.yaml"),
      `oauth:
  scope: "openid"
`,
    );

    const result = await findProfilesWithScopes(["r_member_postAnalytics"], { home: dir });
    expect(result).toEqual([]);
  });

  it("returns empty when no profile directory exists", async () => {
    const result = await findProfilesWithScopes(["openid"], { home: dir });
    expect(result).toEqual([]);
  });
});
