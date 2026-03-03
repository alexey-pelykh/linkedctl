// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { afterEach, describe, expect, it } from "vitest";
import { startCallbackServer } from "./callback-server.js";

describe("callback server", () => {
  let stop: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (stop) {
      await stop();
      stop = undefined;
    }
  });

  it("listens on a random port", async () => {
    const server = await startCallbackServer();
    stop = server.stop;

    expect(server.port).toBeGreaterThan(0);
  });

  it("returns code and state from callback", async () => {
    const server = await startCallbackServer();
    stop = server.stop;

    const callbackUrl = `http://127.0.0.1:${server.port}/callback?code=auth-code&state=test-state`;
    const response = await fetch(callbackUrl);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Authorization successful");

    const result = await server.result;
    expect(result.code).toBe("auth-code");
    expect(result.state).toBe("test-state");
  });

  it("rejects when error parameter is present", async () => {
    const server = await startCallbackServer();
    stop = server.stop;

    // Attach rejection handler BEFORE triggering the error to avoid unhandled rejection
    const resultPromise = server.result.catch((e: unknown) => e);

    const callbackUrl = `http://127.0.0.1:${server.port}/callback?error=access_denied&error_description=User+denied`;
    const response = await fetch(callbackUrl);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Authorization failed");

    const error = await resultPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Authorization denied: User denied/);
  });

  it("rejects when code is missing", async () => {
    const server = await startCallbackServer();
    stop = server.stop;

    // Attach rejection handler BEFORE triggering the error to avoid unhandled rejection
    const resultPromise = server.result.catch((e: unknown) => e);

    const callbackUrl = `http://127.0.0.1:${server.port}/callback?state=only-state`;
    const response = await fetch(callbackUrl);

    expect(response.status).toBe(400);

    const error = await resultPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Missing code or state/);
  });

  it("returns 404 for non-callback paths", async () => {
    const server = await startCallbackServer();
    stop = server.stop;

    const response = await fetch(`http://127.0.0.1:${server.port}/other`);
    expect(response.status).toBe(404);
  });
});
