// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { createCommand } from "./create.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

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
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

const { homedir } = await import("node:os");
const { writeFile, mkdir } = await import("node:fs/promises");

describe("profile create", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let loadConfigFileSpy: ReturnType<typeof vi.spyOn>;
  let saveOAuthTokensSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    loadConfigFileSpy = vi.spyOn(core, "loadConfigFile").mockResolvedValue({ raw: undefined, path: undefined });
    saveOAuthTokensSpy = vi.spyOn(core, "saveOAuthTokens").mockResolvedValue(undefined);
    vi.mocked(homedir).mockReturnValue("/mock/home");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a profile with explicit api version", async () => {
    const cmd = createCommand();
    await cmd.parseAsync(["personal", "--access-token", "tok123", "--api-version", "202502"], { from: "user" });

    expect(loadConfigFileSpy).toHaveBeenCalledWith({ profile: "personal" });
    expect(vi.mocked(mkdir)).toHaveBeenCalledWith(join("/mock/home", ".linkedctl"), { recursive: true });
    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      join("/mock/home", ".linkedctl", "personal.yaml"),
      'api-version: "202502"\n',
      { mode: 0o600 },
    );
    expect(saveOAuthTokensSpy).toHaveBeenCalledWith({ accessToken: "tok123" }, { profile: "personal" });
    expect(consoleSpy).toHaveBeenCalledWith('Profile "personal" created.');
  });

  it("defaults api version when not specified", async () => {
    const cmd = createCommand();
    await cmd.parseAsync(["personal", "--access-token", "tok123"], { from: "user" });

    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      join("/mock/home", ".linkedctl", "personal.yaml"),
      `api-version: "${core.DEFAULT_API_VERSION}"\n`,
      { mode: 0o600 },
    );
    expect(saveOAuthTokensSpy).toHaveBeenCalledWith({ accessToken: "tok123" }, { profile: "personal" });
    expect(consoleSpy).toHaveBeenCalledWith('Profile "personal" created.');
  });

  it("throws when profile already exists", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: { "api-version": "202601" },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = createCommand();
    await expect(cmd.parseAsync(["personal", "--access-token", "tok"], { from: "user" })).rejects.toThrow(
      /already exists/,
    );
  });

  it("throws for invalid profile name", async () => {
    const cmd = createCommand();
    await expect(cmd.parseAsync(["../evil", "--access-token", "tok"], { from: "user" })).rejects.toThrow(
      /Invalid profile name/,
    );
  });

  it("does not write files when profile already exists", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: { "api-version": "202601" },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = createCommand();
    await expect(cmd.parseAsync(["personal", "--access-token", "tok"], { from: "user" })).rejects.toThrow();

    expect(vi.mocked(writeFile)).not.toHaveBeenCalled();
    expect(saveOAuthTokensSpy).not.toHaveBeenCalled();
  });
});
