// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { logoutCommand } from "./logout.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

describe("auth logout", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let clearOAuthTokensSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    clearOAuthTokensSpy = vi.spyOn(core, "clearOAuthTokens").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears credentials from the default config", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: { "access-token": "secret-token" },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = logoutCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(clearOAuthTokensSpy).toHaveBeenCalledWith({ profile: undefined });
    expect(consoleSpy).toHaveBeenCalledWith('Credentials cleared for profile "default".');
  });

  it("throws when no OAuth credentials configured", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { "api-version": "202501" },
      path: "/some/path.yaml",
    });

    const cmd = logoutCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/No OAuth credentials configured/);
  });

  it("throws when config file does not exist (empty config)", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: undefined,
      path: undefined,
    });

    const cmd = logoutCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/No OAuth credentials configured/);
  });
});
