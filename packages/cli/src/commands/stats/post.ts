// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getPostAnalytics, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";
import { warnUnavailableMetrics, buildTotalRows, enhanceAnalyticsScopeError } from "./helpers.js";

export function postCommand(): Command {
  const cmd = new Command("post");
  cmd.description("Get analytics for a LinkedIn post");
  cmd.argument("<urn>", "post URN (e.g. urn:li:share:123 or urn:li:ugcPost:123)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (urn: string, opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    try {
      const { config } = await resolveConfig({
        profile: globals.profile,
        requiredScopes: ["r_member_postAnalytics"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const analytics = await getPostAnalytics(client, { postUrn: urn });

      warnUnavailableMetrics(analytics);

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);

      if (format === "json") {
        console.log(formatOutput(analytics, format));
      } else {
        const rows = buildTotalRows(analytics);
        if (rows.length === 0) {
          console.log("No metrics available.");
          return;
        }
        console.log(formatOutput(rows, format));
      }
    } catch (error) {
      enhanceAnalyticsScopeError(error, globals.profile);
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to get post analytics: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
