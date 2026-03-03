// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import {
  loadConfigFile,
  validateConfig,
  saveOAuthTokens,
  saveOAuthClientCredentials,
  refreshAccessToken,
} from "@linkedctl/core";
import type { OAuth2Config } from "@linkedctl/core";

export function refreshCommand(): Command {
  const cmd = new Command("refresh");
  cmd.description("Refresh the access token using a stored refresh token");

  cmd.action(async (_opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);

    const clientId = config.oauth?.clientId;
    const clientSecret = config.oauth?.clientSecret;

    if (clientId === undefined || clientSecret === undefined) {
      throw new Error(
        "Missing OAuth2 credentials in config. " +
          'Run "linkedctl auth login --client-id <id> --client-secret <secret>" first.',
      );
    }

    const existingRefreshToken = config.oauth?.refreshToken;

    if (existingRefreshToken === undefined) {
      throw new Error(
        "No refresh token available. " +
          "Refresh tokens are only available for approved LinkedIn Marketing Developer Platform (MDP) partners. " +
          'Run "linkedctl auth login" to re-authenticate.',
      );
    }

    const oauth2Config: OAuth2Config = {
      clientId,
      clientSecret,
      redirectUri: "",
      scope: "",
    };

    const writeOpts = { profile: profileFlag };

    try {
      const tokens = await refreshAccessToken(oauth2Config, existingRefreshToken);
      const expiry = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      await saveOAuthTokens(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? existingRefreshToken,
          tokenExpiresAt: expiry,
        },
        writeOpts,
      );
      await saveOAuthClientCredentials({ clientId, clientSecret }, writeOpts);
      const label = profileFlag ?? "default";
      console.log(`Token refreshed for profile "${label}".`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Token refresh failed: ${message}. ` + 'Run "linkedctl auth login" to re-authenticate.');
    }
  });

  return cmd;
}
