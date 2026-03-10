// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getPostAnalytics, getOrgStats, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";
import { warnUnavailableMetrics, buildTotalRows, enhanceAnalyticsScopeError } from "./helpers.js";

export function postCommand(): Command {
  const cmd = new Command("post");
  cmd.description("Get analytics for a LinkedIn post");
  cmd.argument("<urn>", "post URN (e.g. urn:li:share:123 or urn:li:ugcPost:123)");
  cmd.option("--org <id>", "organization ID for org share statistics (numeric, e.g. 12345)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (urn: string, opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();
    const orgId = opts["org"] as string | undefined;

    if (orgId !== undefined) {
      await handleOrgPostStats(urn, orgId, opts, globals);
    } else {
      await handleMemberPostStats(urn, opts, globals);
    }
  });

  return cmd;
}

async function handleMemberPostStats(
  urn: string,
  opts: Record<string, unknown>,
  globals: { profile?: string | undefined; json?: boolean | undefined },
): Promise<void> {
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
}

async function handleOrgPostStats(
  urn: string,
  orgId: string,
  opts: Record<string, unknown>,
  globals: { profile?: string | undefined; json?: boolean | undefined },
): Promise<void> {
  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["rw_organization_admin"],
  });
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  try {
    const organizationUrn = `urn:li:organization:${orgId}`;

    const response = await getOrgStats(client, {
      organizationUrn,
      shares: [urn],
    });

    const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);
    if (format === "json") {
      console.log(formatOutput(response, format));
    } else {
      const el = response.elements[0];
      if (el === undefined) {
        console.log("No statistics found for this post.");
        return;
      }
      const s = el.totalShareStatistics;
      console.log(
        formatOutput(
          {
            post: el.share ?? urn,
            impressions: s.impressionCount,
            uniqueImpressions: s.uniqueImpressionsCount,
            clicks: s.clickCount,
            likes: s.likeCount,
            comments: s.commentCount,
            shares: s.shareCount,
            engagement: s.engagement,
          },
          format,
        ),
      );
    }
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to get post statistics: ${error.message}`);
    }
    throw error;
  }
}
