// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { loadConfigFile, validateConfig, clearOAuthTokens, revokeAccessToken } from "@linkedctl/core";
import { confirmOrAbort } from "../../confirm.js";

export function revokeCommand(): Command {
  const cmd = new Command("revoke");
  cmd.description("Revoke the access token server-side and clear local credentials");
  cmd.option("-f, --force", "skip confirmation prompt");

  cmd.action(async (opts: { force?: true }, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);

    const accessToken = config.oauth?.accessToken;
    const clientId = config.oauth?.clientId;
    const clientSecret = config.oauth?.clientSecret;
    const label = profileFlag ?? "default";

    await confirmOrAbort(`Revoke access token and clear credentials for profile "${label}"?`, opts.force === true);

    if (accessToken === undefined || accessToken === "" || clientId === undefined || clientSecret === undefined) {
      await clearOAuthTokens({ profile: profileFlag });
      console.log(
        `No complete credentials for server-side revocation (missing access token, client ID, or client secret). Local credentials cleared for profile "${label}".`,
      );
      return;
    }

    try {
      await revokeAccessToken(clientId, clientSecret, accessToken);
      console.log(`Access token revoked server-side for profile "${label}".`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Server-side revocation failed: ${message}`);
      console.warn("Local credentials will still be cleared.");
    }

    await clearOAuthTokens({ profile: profileFlag });
    console.log(`Local credentials cleared for profile "${label}".`);
  });

  return cmd;
}
