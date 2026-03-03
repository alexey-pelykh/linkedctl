// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import {
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  getProfile,
  setProfile,
  refreshAccessToken,
} from "@linkedctl/core";
import type { OAuth2Config } from "@linkedctl/core";

export function refreshCommand(): Command {
  const cmd = new Command("refresh");
  cmd.description("Refresh the access token using a stored refresh token");

  cmd.action(async (_opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const configPath = getDefaultConfigPath();
    let config = await readConfigFile(configPath);

    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;
    const profileName = profileFlag ?? config["default-profile"] ?? "default";
    const existingProfile = getProfile(config, profileName);

    if (existingProfile === undefined) {
      throw new Error(`Profile "${profileName}" not found.`);
    }

    const clientId = existingProfile["client-id"];
    const clientSecret = existingProfile["client-secret"];

    if (clientId === undefined || clientSecret === undefined) {
      throw new Error(
        "Missing OAuth2 credentials in profile. " +
          'Run "linkedctl auth login --client-id <id> --client-secret <secret>" first.',
      );
    }

    const existingRefreshToken = existingProfile["refresh-token"];

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

    try {
      const tokens = await refreshAccessToken(oauth2Config, existingRefreshToken);
      const expiry = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      const updatedProfile = {
        "access-token": tokens.accessToken,
        "api-version": existingProfile["api-version"],
        "client-id": clientId,
        "client-secret": clientSecret,
        "refresh-token": tokens.refreshToken ?? existingProfile["refresh-token"],
        "token-expiry": expiry,
      };

      config = setProfile(config, profileName, updatedProfile);
      await writeConfigFile(configPath, config);
      console.log(`Token refreshed for profile "${profileName}".`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Token refresh failed: ${message}. ` + 'Run "linkedctl auth login" to re-authenticate.',
      );
    }
  });

  return cmd;
}
