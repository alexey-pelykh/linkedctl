// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { loadConfigFile, validateConfig, clearOAuthTokens } from "@linkedctl/core";

export function logoutCommand(): Command {
  const cmd = new Command("logout");
  cmd.description("Clear stored credentials from the active config");

  cmd.action(async (_opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const { raw } = await loadConfigFile({ profile: profileFlag });
    const { config } = validateConfig(raw);

    if (config.oauth === undefined) {
      throw new Error("No OAuth credentials configured.");
    }

    await clearOAuthTokens({ profile: profileFlag });
    const label = profileFlag ?? "default";
    console.log(`Credentials cleared for profile "${label}".`);
  });

  return cmd;
}
