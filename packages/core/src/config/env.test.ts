// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { applyEnvOverlay } from "./env.js";

describe("applyEnvOverlay", () => {
  it("returns config unchanged when no env vars are set", () => {
    const config = { apiVersion: "202501", oauth: { accessToken: "tok" } };
    const result = applyEnvOverlay(config, { env: {} });
    expect(result).toEqual(config);
  });

  it("overlays access token from env", () => {
    const config = { oauth: { accessToken: "file-token" } };
    const result = applyEnvOverlay(config, {
      env: { LINKEDCTL_ACCESS_TOKEN: "env-token" },
    });
    expect(result.oauth?.accessToken).toBe("env-token");
  });

  it("overlays api-version from env", () => {
    const config = { apiVersion: "202501" };
    const result = applyEnvOverlay(config, {
      env: { LINKEDCTL_API_VERSION: "202502" },
    });
    expect(result.apiVersion).toBe("202502");
  });

  it("overlays client credentials from env", () => {
    const config = {};
    const result = applyEnvOverlay(config, {
      env: { LINKEDCTL_CLIENT_ID: "env-cid", LINKEDCTL_CLIENT_SECRET: "env-csecret" },
    });
    expect(result.oauth?.clientId).toBe("env-cid");
    expect(result.oauth?.clientSecret).toBe("env-csecret");
  });

  it("uses profile-prefixed env vars", () => {
    const config = {};
    const result = applyEnvOverlay(config, {
      profile: "work",
      env: { LINKEDCTL_WORK_ACCESS_TOKEN: "work-token", LINKEDCTL_WORK_API_VERSION: "202503" },
    });
    expect(result.oauth?.accessToken).toBe("work-token");
    expect(result.apiVersion).toBe("202503");
  });

  it("converts profile name hyphens to underscores", () => {
    const config = {};
    const result = applyEnvOverlay(config, {
      profile: "my-work",
      env: { LINKEDCTL_MY_WORK_ACCESS_TOKEN: "token" },
    });
    expect(result.oauth?.accessToken).toBe("token");
  });

  it("preserves file values when env vars are not set", () => {
    const config = {
      apiVersion: "202501",
      oauth: { accessToken: "file-tok", clientId: "file-cid" },
    };
    const result = applyEnvOverlay(config, {
      env: { LINKEDCTL_ACCESS_TOKEN: "env-tok" },
    });
    expect(result.oauth?.accessToken).toBe("env-tok");
    expect(result.oauth?.clientId).toBe("file-cid");
    expect(result.apiVersion).toBe("202501");
  });

  it("overlays scope from env", () => {
    const config = {};
    const result = applyEnvOverlay(config, {
      env: { LINKEDCTL_SCOPE: "openid profile" },
    });
    expect(result.oauth?.scope).toBe("openid profile");
  });

  it("does not mutate the original config", () => {
    const config = { apiVersion: "202501", oauth: { accessToken: "original" } };
    applyEnvOverlay(config, {
      env: { LINKEDCTL_ACCESS_TOKEN: "new", LINKEDCTL_API_VERSION: "202502" },
    });
    expect(config.apiVersion).toBe("202501");
    expect(config.oauth.accessToken).toBe("original");
  });
});
