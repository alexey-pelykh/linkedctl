// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import {
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  getProfile,
  clearProfileCredentials,
  revokeAccessToken,
} from "@linkedctl/core";

export function revokeCommand(): Command {
  const cmd = new Command("revoke");
  cmd.description("Revoke the access token server-side and clear local credentials");

  cmd.action(async (_opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const configPath = getDefaultConfigPath();
    const config = await readConfigFile(configPath);

    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;
    const profileName = profileFlag ?? config["default-profile"] ?? "default";
    const profile = getProfile(config, profileName);

    if (profile === undefined) {
      throw new Error(`Profile "${profileName}" not found.`);
    }

    const accessToken = profile["access-token"];
    const clientId = profile["client-id"];
    const clientSecret = profile["client-secret"];

    if (accessToken === "" || clientId === undefined || clientSecret === undefined) {
      const updated = clearProfileCredentials(config, profileName);
      await writeConfigFile(configPath, updated);
      console.log(
        `No complete credentials for server-side revocation (missing access token, client ID, or client secret). Local credentials cleared for profile "${profileName}".`,
      );
      return;
    }

    try {
      await revokeAccessToken(clientId, clientSecret, accessToken);
      console.log(`Access token revoked server-side for profile "${profileName}".`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Server-side revocation failed: ${message}`);
      console.warn("Local credentials will still be cleared.");
    }

    const updated = clearProfileCredentials(config, profileName);
    await writeConfigFile(configPath, updated);
    console.log(`Local credentials cleared for profile "${profileName}".`);
  });

  return cmd;
}
