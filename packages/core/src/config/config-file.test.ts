// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile, stat, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  readConfigFile,
  writeConfigFile,
  listProfiles,
  getProfile,
  setProfile,
  deleteProfile,
  setDefaultProfile,
  redactProfile,
  getDefaultConfigPath,
} from "./config-file.js";
import type { ConfigFile, Profile } from "./types.js";

function tempDir(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`);
}

describe("getDefaultConfigPath", () => {
  it("returns a path ending with .linkedctl.yaml", () => {
    const p = getDefaultConfigPath();
    expect(p).toMatch(/\.linkedctl\.yaml$/);
  });
});

describe("readConfigFile", () => {
  it("returns empty config when file does not exist", async () => {
    const config = await readConfigFile("/nonexistent/path/.linkedctl.yaml");
    expect(config).toEqual({});
  });

  it("reads and parses a valid YAML config", async () => {
    const dir = tempDir();
    const path = join(dir, "config.yaml");
    await mkdir(dir, { recursive: true });
    await writeConfigFile(path, {
      "default-profile": "personal",
      profiles: { personal: { "access-token": "tok123", "api-version": "202501" } },
    });

    const config = await readConfigFile(path);
    expect(config["default-profile"]).toBe("personal");
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("tok123");
    await rm(dir, { recursive: true });
  });

  it("throws on invalid YAML syntax", async () => {
    const dir = tempDir();
    const path = join(dir, "invalid.yaml");
    await mkdir(dir, { recursive: true });
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(path, "invalid: yaml: [", { mode: 0o600 });

    await expect(readConfigFile(path)).rejects.toThrow();
    await rm(dir, { recursive: true });
  });

  it("throws when YAML contains an array instead of a mapping", async () => {
    const dir = tempDir();
    const path = join(dir, "array.yaml");
    await mkdir(dir, { recursive: true });
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(path, "- item1\n- item2\n", { mode: 0o600 });

    await expect(readConfigFile(path)).rejects.toThrow(/expected a YAML mapping/);
    await rm(dir, { recursive: true });
  });

  it("returns empty config for an empty YAML file", async () => {
    const dir = tempDir();
    const path = join(dir, "empty.yaml");
    await mkdir(dir, { recursive: true });
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(path, "", { mode: 0o600 });

    const config = await readConfigFile(path);
    expect(config).toEqual({});
    await rm(dir, { recursive: true });
  });
});

describe("writeConfigFile", () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = tempDir();
    path = join(dir, "sub", "config.yaml");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates parent directories and writes valid YAML", async () => {
    const config: ConfigFile = {
      "default-profile": "work",
      profiles: { work: { "access-token": "abc", "api-version": "202501" } },
    };
    await writeConfigFile(path, config);

    const raw = await readFile(path, "utf-8");
    expect(raw).toContain("default-profile: work");
    expect(raw).toContain("access-token: abc");
  });

  it.skipIf(process.platform === "win32")("sets file permissions to 0600", async () => {
    await writeConfigFile(path, {});
    const info = await stat(path);
    // Mask off file type bits to get permission bits
    const mode = info.mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("listProfiles", () => {
  it("returns empty array when no profiles exist", () => {
    expect(listProfiles({})).toEqual([]);
  });

  it("returns profile names", () => {
    const config: ConfigFile = {
      profiles: {
        personal: { "access-token": "a", "api-version": "v" },
        work: { "access-token": "b", "api-version": "v" },
      },
    };
    expect(listProfiles(config)).toEqual(["personal", "work"]);
  });
});

describe("getProfile", () => {
  it("returns profile when it exists", () => {
    const profile: Profile = { "access-token": "tok", "api-version": "202501" };
    const config: ConfigFile = { profiles: { test: profile } };
    expect(getProfile(config, "test")).toEqual(profile);
  });

  it("returns undefined for missing profile", () => {
    expect(getProfile({}, "missing")).toBeUndefined();
  });
});

describe("setProfile", () => {
  it("adds a new profile", () => {
    const profile: Profile = { "access-token": "tok", "api-version": "202501" };
    const result = setProfile({}, "new", profile);
    expect(result.profiles?.["new"]).toEqual(profile);
  });

  it("overwrites an existing profile", () => {
    const old: Profile = { "access-token": "old", "api-version": "202501" };
    const updated: Profile = { "access-token": "new", "api-version": "202502" };
    const config: ConfigFile = { profiles: { test: old } };
    const result = setProfile(config, "test", updated);
    expect(result.profiles?.["test"]).toEqual(updated);
  });

  it("does not mutate the original config", () => {
    const config: ConfigFile = { profiles: {} };
    const profile: Profile = { "access-token": "tok", "api-version": "v" };
    setProfile(config, "new", profile);
    expect(config.profiles?.["new"]).toBeUndefined();
  });
});

describe("deleteProfile", () => {
  it("removes a profile", () => {
    const config: ConfigFile = {
      profiles: {
        a: { "access-token": "1", "api-version": "v" },
        b: { "access-token": "2", "api-version": "v" },
      },
    };
    const result = deleteProfile(config, "a");
    expect(result.profiles?.["a"]).toBeUndefined();
    expect(result.profiles?.["b"]).toBeDefined();
  });

  it("clears default-profile when deleting the default", () => {
    const config: ConfigFile = {
      "default-profile": "main",
      profiles: { main: { "access-token": "tok", "api-version": "v" } },
    };
    const result = deleteProfile(config, "main");
    expect(result["default-profile"]).toBeUndefined();
  });

  it("preserves default-profile when deleting a non-default", () => {
    const config: ConfigFile = {
      "default-profile": "main",
      profiles: {
        main: { "access-token": "1", "api-version": "v" },
        other: { "access-token": "2", "api-version": "v" },
      },
    };
    const result = deleteProfile(config, "other");
    expect(result["default-profile"]).toBe("main");
  });

  it("does not mutate the original config", () => {
    const config: ConfigFile = {
      profiles: { a: { "access-token": "tok", "api-version": "v" } },
    };
    deleteProfile(config, "a");
    expect(config.profiles?.["a"]).toBeDefined();
  });
});

describe("setDefaultProfile", () => {
  it("sets the default profile", () => {
    const result = setDefaultProfile({}, "work");
    expect(result["default-profile"]).toBe("work");
  });

  it("does not mutate the original config", () => {
    const config: ConfigFile = {};
    setDefaultProfile(config, "work");
    expect(config["default-profile"]).toBeUndefined();
  });
});

describe("redactProfile", () => {
  it("redacts long tokens keeping first and last 4 chars", () => {
    const profile: Profile = { "access-token": "abcd1234efgh5678", "api-version": "202501" };
    const result = redactProfile(profile);
    expect(result["access-token"]).toBe("abcd****5678");
    expect(result["api-version"]).toBe("202501");
  });

  it("fully redacts short tokens", () => {
    const profile: Profile = { "access-token": "short", "api-version": "202501" };
    const result = redactProfile(profile);
    expect(result["access-token"]).toBe("****");
  });

  it("fully redacts tokens with exactly 8 characters", () => {
    const profile: Profile = { "access-token": "12345678", "api-version": "202501" };
    const result = redactProfile(profile);
    expect(result["access-token"]).toBe("****");
  });
});
