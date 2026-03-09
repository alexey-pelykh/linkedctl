// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { loadConfigFile, validateConfig, clearOAuthTokens } from "@linkedctl/core";
import { confirmOrAbort } from "../../confirm.js";

export function logoutCommand(): Command {
  const cmd = new Command("logout");
  cmd.description("Clear stored credentials from the active config");
  cmd.option("-f, --force", "skip confirmation prompt");

  cmd.action(async (opts: { force?: true }, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);

    if (config.oauth === undefined) {
      throw new Error(
        'No OAuth credentials configured. Run "linkedctl auth setup" to configure credentials, ' +
          'or "linkedctl auth login" to authenticate.',
      );
    }

    const label = profileFlag ?? "default";
    await confirmOrAbort(`Clear credentials for profile "${label}"?`, opts.force === true);

    await clearOAuthTokens({ profile: profileFlag });
    console.log(`Credentials cleared for profile "${label}".`);
  });

  return cmd;
}
