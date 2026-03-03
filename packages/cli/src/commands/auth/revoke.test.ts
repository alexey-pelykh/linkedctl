// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { revokeCommand } from "./revoke.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

describe("auth revoke", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let clearOAuthTokensSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    clearOAuthTokensSpy = vi.spyOn(core, "clearOAuthTokens").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("revokes token server-side and clears local credentials", async () => {
    const revokeSpy = vi.spyOn(core, "revokeAccessToken").mockResolvedValueOnce(undefined);

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "secret-token",
          "client-id": "my-client-id",
          "client-secret": "my-client-secret",
        },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(revokeSpy).toHaveBeenCalledWith("my-client-id", "my-client-secret", "secret-token");
    expect(clearOAuthTokensSpy).toHaveBeenCalledWith({ profile: undefined });
    expect(consoleSpy).toHaveBeenCalledWith('Access token revoked server-side for profile "default".');
    expect(consoleSpy).toHaveBeenCalledWith('Local credentials cleared for profile "default".');
  });

  it("clears local credentials with warning when server-side revocation fails", async () => {
    vi.spyOn(core, "revokeAccessToken").mockRejectedValueOnce(new Error("network error"));

    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "secret-token",
          "client-id": "my-client-id",
          "client-secret": "my-client-secret",
        },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(clearOAuthTokensSpy).toHaveBeenCalledWith({ profile: undefined });
    expect(warnSpy).toHaveBeenCalledWith("Warning: Server-side revocation failed: network error");
    expect(consoleSpy).toHaveBeenCalledWith('Local credentials cleared for profile "default".');
  });

  it("clears local credentials when client credentials are missing", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "secret-token",
        },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(clearOAuthTokensSpy).toHaveBeenCalledWith({ profile: undefined });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No complete credentials for server-side revocation"),
    );
  });

  it("clears local credentials when access token is empty", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "",
          "client-id": "cid",
          "client-secret": "csecret",
        },
        "api-version": "202501",
      },
      path: "/some/path.yaml",
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(clearOAuthTokensSpy).toHaveBeenCalledWith({ profile: undefined });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No complete credentials for server-side revocation"),
    );
  });

  it("clears credentials when no OAuth section exists", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: { "api-version": "202501" },
      path: "/some/path.yaml",
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(clearOAuthTokensSpy).toHaveBeenCalledWith({ profile: undefined });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No complete credentials for server-side revocation"),
    );
  });
});
