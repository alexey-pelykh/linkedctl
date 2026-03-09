// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { readFile, rm, mkdir, writeFile, stat } from "node:fs/promises";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { parse } from "yaml";
import {
  saveOAuthTokens,
  saveOAuthClientCredentials,
  saveOAuthScope,
  saveApiVersion,
  clearOAuthTokens,
} from "./writer.js";

function tempDir(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`);
}

describe("saveOAuthTokens", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates a new config file with tokens", async () => {
    await saveOAuthTokens(
      { accessToken: "tok", refreshToken: "rtok", tokenExpiresAt: "2026-05-01T00:00:00Z" },
      { home: dir, cwd: dir },
    );

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["access-token"]).toBe("tok");
    expect(oauth["refresh-token"]).toBe("rtok");
    expect(oauth["token-expires-at"]).toBe("2026-05-01T00:00:00Z");
  });

  it("preserves existing fields when updating tokens", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  client-id: "cid"
  client-secret: "csecret"
api-version: "202601"
`,
    );

    await saveOAuthTokens({ accessToken: "new-tok" }, { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    expect((parsed["oauth"] as Record<string, unknown>)["client-id"]).toBe("cid");
    expect((parsed["oauth"] as Record<string, unknown>)["access-token"]).toBe("new-tok");
    expect(parsed["api-version"]).toBe("202601");
  });

  it("writes to profile-specific path", async () => {
    await saveOAuthTokens({ accessToken: "tok" }, { profile: "work", home: dir });

    const path = join(dir, ".linkedctl", "work.yaml");
    const content = await readFile(path, "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    expect((parsed["oauth"] as Record<string, unknown>)["access-token"]).toBe("tok");
  });

  it.skipIf(process.platform === "win32")("sets file permissions to 0600", async () => {
    await saveOAuthTokens({ accessToken: "tok" }, { home: dir, cwd: dir });

    const info = await stat(join(dir, ".linkedctl.yaml"));
    expect(info.mode & 0o777).toBe(0o600);
  });
});

describe("saveOAuthClientCredentials", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates config file with client credentials", async () => {
    await saveOAuthClientCredentials({ clientId: "cid", clientSecret: "csecret" }, { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["client-id"]).toBe("cid");
    expect(oauth["client-secret"]).toBe("csecret");
  });

  it("preserves existing tokens when updating credentials", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  access-token: "existing-tok"
`,
    );

    await saveOAuthClientCredentials({ clientId: "cid", clientSecret: "csecret" }, { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["access-token"]).toBe("existing-tok");
    expect(oauth["client-id"]).toBe("cid");
  });
});

describe("saveOAuthScope", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates config file with scope", async () => {
    await saveOAuthScope("openid profile email", { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["scope"]).toBe("openid profile email");
  });

  it("preserves existing credentials when saving scope", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  client-id: "cid"
  client-secret: "csecret"
`,
    );

    await saveOAuthScope("w_member_social", { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["client-id"]).toBe("cid");
    expect(oauth["client-secret"]).toBe("csecret");
    expect(oauth["scope"]).toBe("w_member_social");
  });
});

describe("saveApiVersion", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("creates config file with api-version", async () => {
    await saveApiVersion("202601", { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    expect(parsed["api-version"]).toBe("202601");
  });

  it("preserves existing fields when saving api-version", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  client-id: "cid"
  client-secret: "csecret"
`,
    );

    await saveApiVersion("202601", { home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    expect(parsed["api-version"]).toBe("202601");
    expect((parsed["oauth"] as Record<string, unknown>)["client-id"]).toBe("cid");
  });
});

describe("clearOAuthTokens", () => {
  let dir: string;

  beforeEach(() => {
    dir = tempDir();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("removes token fields but preserves client credentials", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".linkedctl.yaml"),
      `oauth:
  client-id: "cid"
  client-secret: "csecret"
  access-token: "tok"
  refresh-token: "rtok"
  token-expires-at: "2026-05-01T00:00:00Z"
api-version: "202601"
`,
    );

    await clearOAuthTokens({ home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["client-id"]).toBe("cid");
    expect(oauth["client-secret"]).toBe("csecret");
    expect(oauth["access-token"]).toBeUndefined();
    expect(oauth["refresh-token"]).toBeUndefined();
    expect(oauth["token-expires-at"]).toBeUndefined();
    expect(parsed["api-version"]).toBe("202601");
  });

  it("handles config with no oauth section", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".linkedctl.yaml"), 'api-version: "202601"\n');

    await clearOAuthTokens({ home: dir, cwd: dir });

    const content = await readFile(join(dir, ".linkedctl.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    expect(parsed["api-version"]).toBe("202601");
  });

  it("clears tokens from profile-specific file", async () => {
    const profileDir = join(dir, ".linkedctl");
    await mkdir(profileDir, { recursive: true });
    await writeFile(
      join(profileDir, "work.yaml"),
      `oauth:
  access-token: "tok"
  client-id: "cid"
`,
    );

    await clearOAuthTokens({ profile: "work", home: dir });

    const content = await readFile(join(profileDir, "work.yaml"), "utf-8");
    const parsed = parse(content) as Record<string, unknown>;
    const oauth = parsed["oauth"] as Record<string, unknown>;
    expect(oauth["client-id"]).toBe("cid");
    expect(oauth["access-token"]).toBeUndefined();
  });
});
