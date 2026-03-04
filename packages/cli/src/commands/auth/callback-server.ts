// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { createServer, type Server } from "node:http";

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>LinkedCtl</title></head>
<body style="font-family:system-ui;text-align:center;padding:4rem">
<h1>Authorization successful</h1>
<p>You may close this window and return to your terminal.</p>
</body></html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html><head><title>LinkedCtl</title></head>
<body style="font-family:system-ui;text-align:center;padding:4rem">
<h1>Authorization failed</h1>
<p>Something went wrong. Please check your terminal for details.</p>
</body></html>`;

export interface CallbackResult {
  code: string;
  state: string;
}

/**
 * Start a local HTTP server on a random available port and wait for the
 * OAuth2 callback from LinkedIn.
 *
 * Returns an object containing the port, a promise that resolves with the
 * authorization code and state, and a stop function to shut down the server.
 */
export async function startCallbackServer(port: number): Promise<{
  port: number;
  result: Promise<CallbackResult>;
  stop: () => Promise<void>;
}> {
  let resolveResult: (value: CallbackResult) => void;
  let rejectResult: (reason: Error) => void;
  const result = new Promise<CallbackResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost`);

    if (url.pathname !== "/callback") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error !== null) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(ERROR_HTML);
      rejectResult(new Error(`Authorization denied: ${errorDescription ?? error}`));
      return;
    }

    if (code === null || state === null) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(ERROR_HTML);
      rejectResult(
        new Error(
          "Missing code or state in callback. " +
            'The OAuth2 flow may have been interrupted. Run "linkedctl auth login" to try again.',
        ),
      );
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(SUCCESS_HTML);
    resolveResult({ code, state });
  });

  const actualPort = await listen(server, port);

  const stop = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  return { port: actualPort, result, stop };
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      if (addr === null || typeof addr === "string") {
        reject(new Error("Unexpected server address type"));
        return;
      }
      resolve(addr.port);
    });
  });
}
