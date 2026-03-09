// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { showCommand } from "./show.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

describe("profile show", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let loadConfigFileSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    loadConfigFileSpy = vi.spyOn(core, "loadConfigFile");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows profile with redacted access token", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: { "access-token": "abcdefghijklmnop" },
        "api-version": "202603",
      },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["personal"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: personal");
    expect(consoleSpy).toHaveBeenCalledWith("  access-token: abcd****mnop");
    expect(consoleSpy).toHaveBeenCalledWith("  api-version: 202603");
  });

  it("shows all redacted oauth fields when present", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: {
          "client-id": "abcdefghijklmnop",
          "client-secret": "secretsecretsecretsecret",
          "access-token": "tokentokentokentoken",
          "refresh-token": "refreshrefreshrefresh",
          "token-expires-at": "2099-12-31T23:59:59Z",
        },
        "api-version": "202603",
      },
      path: "/mock/home/.linkedctl/work.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("Profile: work");
    expect(consoleSpy).toHaveBeenCalledWith("  client-id: abcd****mnop");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("  client-secret: secr****cret"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("  access-token: toke****oken"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("  refresh-token: refr****resh"));
    expect(consoleSpy).toHaveBeenCalledWith("  token-expires-at: 2099-12-31T23:59:59Z");
    expect(consoleSpy).toHaveBeenCalledWith("  api-version: 202603");
  });

  it("shows short secrets as fully redacted", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: { "access-token": "short" },
        "api-version": "202603",
      },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["personal"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledWith("  access-token: ****");
  });

  it("throws when profile does not exist", async () => {
    loadConfigFileSpy.mockResolvedValue({ raw: undefined, path: undefined });

    const cmd = showCommand();
    await expect(cmd.parseAsync(["nonexistent"], { from: "user" })).rejects.toThrow(/not found/);
  });

  it("throws for invalid profile name", async () => {
    const cmd = showCommand();
    await expect(cmd.parseAsync(["../evil"], { from: "user" })).rejects.toThrow(/Invalid profile name/);
  });
});
