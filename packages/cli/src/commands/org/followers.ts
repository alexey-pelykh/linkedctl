// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getOrganizationFollowerCount, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

export function followersCommand(): Command {
  const cmd = new Command("followers");
  cmd.description("Get the follower count for an organization");
  cmd.argument("<id>", "organization ID (numeric, e.g. 12345)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (id: string, opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      const organizationUrn = `urn:li:organization:${id}`;
      const followerCount = await getOrganizationFollowerCount(client, organizationUrn);

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput({ organization: organizationUrn, followerCount }, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to get follower count: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
