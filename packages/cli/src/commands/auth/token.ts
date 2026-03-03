// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { saveOAuthTokens } from "@linkedctl/core";

export function tokenCommand(): Command {
  const cmd = new Command("token");
  cmd.description("Store a direct access token in the active profile");
  cmd.requiredOption("--access-token <token>", "access token to store");

  cmd.action(async (_opts: { accessToken: string }, command: Command) => {
    const globals = command.optsWithGlobals<{ profile?: string | undefined; accessToken: string }>();
    const profileFlag = globals.profile;

    await saveOAuthTokens({ accessToken: globals.accessToken }, { profile: profileFlag });
    const label = profileFlag ?? "default";
    console.log(`Access token stored in profile "${label}".`);
  });

  return cmd;
}
