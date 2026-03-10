// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { loadConfigFile, CONFIG_DIR } from "./loader.js";

function tempDir(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`);
}

describe("CONFIG_DIR", () => {
  it("equals .linkedctl", () => {
    expect(CONFIG_DIR).toBe(".linkedctl");
  });
});

describe("loadConfigFile", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns undefined when no file exists", async () => {
    const result = await loadConfigFile({ home: dir, cwd: dir });
    expect(result.raw).toBeUndefined();
    expect(result.path).toBeUndefined();
  });

  it("loads profile-specific file from ~/.linkedctl/{profile}.yaml", async () => {
    const profileDir = join(dir, CONFIG_DIR);
    await mkdir(profileDir, { recursive: true });
    await writeFile(join(profileDir, "work.yaml"), 'api-version: "202601"\n');

    const result = await loadConfigFile({ profile: "work", home: dir });
    expect(result.path).toBe(join(profileDir, "work.yaml"));
    expect(result.raw).toEqual({ "api-version": "202601" });
  });

  it("loads CWD .linkedctl.yaml before home", async () => {
    const cwd = join(dir, "project");
    const home = join(dir, "home");
    await mkdir(cwd, { recursive: true });
    await mkdir(home, { recursive: true });
    await writeFile(join(cwd, ".linkedctl.yaml"), 'api-version: "cwd"\n');
    await writeFile(join(home, ".linkedctl.yaml"), 'api-version: "home"\n');

    const result = await loadConfigFile({ cwd, home });
    expect(result.raw).toEqual({ "api-version": "cwd" });
    expect(result.path).toBe(join(cwd, ".linkedctl.yaml"));
  });

  it("falls back to home .linkedctl.yaml when CWD has no config", async () => {
    const cwd = join(dir, "project");
    const home = join(dir, "home");
    await mkdir(cwd, { recursive: true });
    await mkdir(home, { recursive: true });
    await writeFile(join(home, ".linkedctl.yaml"), 'api-version: "home"\n');

    const result = await loadConfigFile({ cwd, home });
    expect(result.raw).toEqual({ "api-version": "home" });
    expect(result.path).toBe(join(home, ".linkedctl.yaml"));
  });

  it("returns undefined for empty YAML file", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".linkedctl.yaml"), "");

    const result = await loadConfigFile({ cwd: dir, home: dir });
    expect(result.raw).toBeUndefined();
    expect(result.path).toBe(join(dir, ".linkedctl.yaml"));
  });

  it("returns undefined for missing profile file", async () => {
    const result = await loadConfigFile({ profile: "nonexistent", home: dir });
    expect(result.raw).toBeUndefined();
    expect(result.path).toBeUndefined();
  });

  it("rejects profile names with path traversal", async () => {
    await expect(loadConfigFile({ profile: "../etc/passwd", home: dir })).rejects.toThrow(TypeError);
    await expect(loadConfigFile({ profile: "foo/bar", home: dir })).rejects.toThrow(TypeError);
    await expect(loadConfigFile({ profile: "foo\\bar", home: dir })).rejects.toThrow(TypeError);
    await expect(loadConfigFile({ profile: "..", home: dir })).rejects.toThrow(TypeError);
    await expect(loadConfigFile({ profile: "", home: dir })).rejects.toThrow(TypeError);
  });

  it("parses complex YAML config", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  client-id: "cid"
  client-secret: "csecret"
  access-token: "tok"
api-version: "202601"
`,
    );

    const result = await loadConfigFile({ cwd: dir, home: dir });
    expect(result.raw).toEqual({
      oauth: {
        "client-id": "cid",
        "client-secret": "csecret",
        "access-token": "tok",
      },
      "api-version": "202601",
    });
  });
});
