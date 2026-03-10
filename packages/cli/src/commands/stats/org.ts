// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getOrgStats, LinkedInApiError } from "@linkedctl/core";
import type { OrgStatsElement, OrgStatsTimeGranularity } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatStatsRow(el: OrgStatsElement): Record<string, unknown> {
  const s = el.totalShareStatistics;
  const row: Record<string, unknown> = {};
  if (el.timeRange !== undefined) {
    row["period"] = `${formatDate(el.timeRange.start)} - ${formatDate(el.timeRange.end)}`;
  }
  row["impressions"] = s.impressionCount;
  row["uniqueImpressions"] = s.uniqueImpressionsCount;
  row["clicks"] = s.clickCount;
  row["likes"] = s.likeCount;
  row["comments"] = s.commentCount;
  row["shares"] = s.shareCount;
  row["engagement"] = s.engagement;
  return row;
}

export function orgCommand(): Command {
  const cmd = new Command("org");
  cmd.description("Get organization share statistics");
  cmd.argument("<id>", "organization ID (numeric, e.g. 12345)");
  cmd.option("--from <date>", "start date for time-bound stats (ISO 8601, e.g. 2025-01-01)");
  cmd.option("--to <date>", "end date for time-bound stats (ISO 8601, e.g. 2025-06-01)");
  cmd.addOption(
    new Option("--granularity <granularity>", "time granularity for bucketed results")
      .choices(["day", "month"])
      .default("month"),
  );
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (id: string, opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const from = opts["from"] as string | undefined;
    const to = opts["to"] as string | undefined;
    const granularity = opts["granularity"] as string;

    if ((from === undefined) !== (to === undefined)) {
      throw new Error("Both --from and --to must be specified together.");
    }

    if (from === undefined && to === undefined && granularity !== "month") {
      throw new Error("--granularity requires --from and --to.");
    }

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["rw_organization_admin"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      const organizationUrn = `urn:li:organization:${id}`;
      const options: Parameters<typeof getOrgStats>[1] = { organizationUrn };

      if (from !== undefined && to !== undefined) {
        options.timeGranularity = granularity.toUpperCase() as OrgStatsTimeGranularity;
        options.timeRange = {
          start: new Date(from).getTime(),
          end: new Date(to).getTime(),
        };
      }

      const response = await getOrgStats(client, options);

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);
      if (format === "json") {
        console.log(formatOutput(response, format));
      } else {
        const rows = response.elements.map(formatStatsRow);
        const data = rows.length === 1 ? rows[0] : rows;
        console.log(formatOutput(data, format));
      }
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to get organization statistics: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
