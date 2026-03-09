// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { platform } from "node:os";
import { Command } from "commander";
import {
  loadConfigFile,
  validateConfig,
  saveOAuthTokens,
  saveOAuthClientCredentials,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  generateCodeVerifier,
  computeCodeChallenge,
} from "@linkedctl/core";
import type { OAuth2Config } from "@linkedctl/core";

import { startCallbackServer } from "./callback-server.js";

export const DEFAULT_REDIRECT_PORT = 18920;

export function loginCommand(): Command {
  const cmd = new Command("login");
  cmd.description("Authenticate with LinkedIn via OAuth2");
  cmd.option("--client-id <id>", "OAuth2 client ID (overrides config value)");
  cmd.option("--client-secret <secret>", "OAuth2 client secret (overrides config value)");
  cmd.option("--scope <scopes>", "OAuth2 scopes (space-separated)");
  cmd.option("--port <number>", "local callback server port", String(DEFAULT_REDIRECT_PORT));
  cmd.option("--pkce", "use PKCE flow (requires LinkedIn to enable it for your app)");

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl auth login
  linkedctl auth login --client-id <id> --client-secret <secret>
  linkedctl auth login --profile work`,
  );

  cmd.action(async (opts: { clientId?: string; clientSecret?: string; scope?: string; port: string; pkce?: true }) => {
    const program = cmd.parent?.parent;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const profileFlag: string | undefined = program?.opts()["profile"];

    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);

    // Resolve client credentials: CLI flags > config
    const clientId = opts.clientId ?? config.oauth?.clientId;
    const clientSecret = opts.clientSecret ?? config.oauth?.clientSecret;

    if (clientId === undefined || clientSecret === undefined) {
      throw new Error(
        "Missing OAuth2 credentials. Provide --client-id and --client-secret, " +
          'or run "linkedctl auth setup" to configure them interactively.',
      );
    }

    // Resolve scope: CLI flag > config
    const scope = opts.scope ?? config.oauth?.scope;
    if (scope === undefined) {
      throw new Error(
        "Missing OAuth2 scope. Provide --scope, " + 'or run "linkedctl auth setup" to configure it interactively.',
      );
    }

    const writeOpts = { profile: profileFlag };

    // Check for existing refresh token and attempt refresh first
    const existingRefreshToken = config.oauth?.refreshToken;
    if (existingRefreshToken !== undefined) {
      console.error("Attempting token refresh...");
      const refreshConfig: OAuth2Config = {
        clientId,
        clientSecret,
        redirectUri: "", // not used for refresh
        scope,
      };
      try {
        const tokens = await refreshAccessToken(refreshConfig, existingRefreshToken);
        const expiry = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
        await saveOAuthTokens(
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: expiry,
          },
          writeOpts,
        );
        await saveOAuthClientCredentials({ clientId, clientSecret }, writeOpts);
        if (profileFlag !== undefined) {
          console.error(`Token refreshed for profile "${profileFlag}".`);
        } else {
          console.error("Token refreshed.");
        }
        return;
      } catch {
        console.error("Token refresh failed, starting full authorization flow...");
      }
    }

    // Full OAuth2 authorization code flow
    const port = Number.parseInt(opts.port, 10);
    const { result, stop } = await startCallbackServer(port);
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const state = randomUUID();
    const usePkce = opts.pkce === true || config.oauth?.pkce === true;

    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (usePkce) {
      codeVerifier = generateCodeVerifier();
      codeChallenge = computeCodeChallenge(codeVerifier);
    }

    const oauth2Config: OAuth2Config = {
      clientId,
      clientSecret,
      redirectUri,
      scope,
    };

    const authUrl = buildAuthorizationUrl(oauth2Config, state, codeChallenge);
    console.error("Opening browser for LinkedIn authorization...");
    console.error(`If the browser does not open, visit:\n${authUrl}`);
    openBrowser(authUrl);

    try {
      const callback = await result;

      if (callback.state !== state) {
        throw new Error(
          "OAuth2 state mismatch — possible CSRF attack. " +
            'The authorization response may have been tampered with. Run "linkedctl auth login" to try again.',
        );
      }

      const tokens = await exchangeAuthorizationCode(oauth2Config, callback.code, codeVerifier);
      const expiry = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      await saveOAuthTokens(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: expiry,
        },
        writeOpts,
      );
      await saveOAuthClientCredentials({ clientId, clientSecret }, writeOpts);
      if (profileFlag !== undefined) {
        console.error(`Authenticated and saved to profile "${profileFlag}".`);
      } else {
        console.error("Authenticated successfully.");
      }
    } finally {
      await stop();
    }
  });

  return cmd;
}

function openBrowser(url: string): void {
  switch (platform()) {
    case "darwin":
      execFile("open", [url]);
      break;
    case "win32":
      execFile("cmd", ["/c", "start", "", url]);
      break;
    default:
      execFile("xdg-open", [url]);
      break;
  }
}
