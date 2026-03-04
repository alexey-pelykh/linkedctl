// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getUserInfo } from "@linkedctl/core";
import type { OutputFormat } from "../output/index.js";
import { resolveFormat, formatOutput } from "../output/index.js";

export function whoamiCommand(): Command {
  const cmd = new Command("whoami");
  cmd.description("Display the current authenticated user's profile");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (opts: Record<string, unknown>, actionCmd: Command) => {
    const rootOpts = actionCmd.optsWithGlobals();
    const profileFlag = typeof rootOpts["profile"] === "string" ? rootOpts["profile"] : undefined;

    const { config } = await resolveConfig({ profile: profileFlag, requiredScopes: ["openid", "profile", "email"] });
    // resolveConfig guarantees oauth.accessToken and apiVersion are defined
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    const userInfo = await getUserInfo(client);

    const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout);

    const data = {
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
    };

    console.log(formatOutput(data, format));
  });

  return cmd;
}
