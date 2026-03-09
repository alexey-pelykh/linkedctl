// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, listOrganizations, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

export function listCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List organizations you administer");
  cmd.option("--count <count>", "number of results to return (default 10, max 100)", "10");
  cmd.option("--start <start>", "starting index for pagination (default 0)", "0");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      const count = parseInt(opts["count"] as string, 10);
      const start = parseInt(opts["start"] as string, 10);

      const response = await listOrganizations(client, { count, start });

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);

      if (format === "json") {
        console.log(formatOutput(response, format));
      } else {
        if (response.elements.length === 0) {
          console.log("No organizations found.");
          return;
        }
        const rows = response.elements.map((acl) => ({
          organization: acl.organization,
          role: acl.role,
          state: acl.state,
        }));
        console.log(formatOutput(rows, format));
      }
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to list organizations: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
