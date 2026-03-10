// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getMemberAnalytics, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";
import {
  warnUnavailableMetrics,
  buildTotalRows,
  buildDailyRows,
  parseDate,
  addDay,
  enhanceAnalyticsScopeError,
} from "./helpers.js";

export function meCommand(): Command {
  const cmd = new Command("me");
  cmd.description("Get aggregated analytics across all your posts");
  cmd.option("--from <date>", "start date for daily breakdown (YYYY-MM-DD, inclusive)");
  cmd.option("--to <date>", "end date for daily breakdown (YYYY-MM-DD, inclusive)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const from = opts["from"] as string | undefined;
    const to = opts["to"] as string | undefined;

    if ((from === undefined) !== (to === undefined)) {
      throw new Error("--from and --to must be used together");
    }

    try {
      const { config } = await resolveConfig({
        profile: globals.profile,
        requiredScopes: ["r_member_postAnalytics"],
      });
      const accessToken = config.oauth?.accessToken ?? "";
      const apiVersion = config.apiVersion ?? "";
      const client = new LinkedInClient({ accessToken, apiVersion });

      const hasDateRange = from !== undefined && to !== undefined;
      const analytics = await getMemberAnalytics(
        client,
        hasDateRange
          ? {
              aggregation: "DAILY",
              dateRange: {
                start: parseDate(from),
                end: addDay(parseDate(to)),
              },
            }
          : undefined,
      );

      warnUnavailableMetrics(analytics);

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);

      if (format === "json") {
        console.log(formatOutput(analytics, format));
      } else if (hasDateRange) {
        const rows = buildDailyRows(analytics);
        if (rows.length === 0) {
          console.log("No data available for the specified date range.");
          return;
        }
        console.log(formatOutput(rows, format));
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
        throw new Error(`Failed to get member analytics: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
