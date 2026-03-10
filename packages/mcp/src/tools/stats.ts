// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getPostAnalytics, getMemberAnalytics, getOrgStats } from "@linkedctl/core";
import type { AnalyticsDateRange } from "@linkedctl/core";

import { withClient } from "./with-client.js";

/**
 * Parse optional from/to date strings (YYYY-MM-DD) into an AnalyticsDateRange.
 * Returns undefined if neither date is provided.
 */
function parseDateRange(from?: string, to?: string): AnalyticsDateRange | undefined {
  if (from === undefined && to === undefined) {
    return undefined;
  }
  const range: AnalyticsDateRange = {};
  if (from !== undefined) {
    const parts = from.split("-").map(Number);
    range.start = { year: parts[0] ?? 0, month: parts[1] ?? 0, day: parts[2] ?? 0 };
  }
  if (to !== undefined) {
    const parts = to.split("-").map(Number);
    range.end = { year: parts[0] ?? 0, month: parts[1] ?? 0, day: parts[2] ?? 0 };
  }
  return range;
}

export function registerStatsTools(server: McpServer): void {
  server.registerTool(
    "stats_post",
    {
      title: "Post Stats",
      description:
        "Get analytics for a single LinkedIn post (impressions, reach, reactions, comments, reshares). Requires the Community Management API product (r_member_postAnalytics scope).",
      inputSchema: {
        post_urn: z.string().describe("Post URN (e.g. urn:li:share:123 or urn:li:ugcPost:123)"),
        aggregation: z
          .enum(["DAILY", "TOTAL"])
          .optional()
          .describe("Aggregation mode (defaults to TOTAL). DAILY returns per-day breakdown."),
        from: z
          .string()
          .optional()
          .describe("Start date inclusive (YYYY-MM-DD). If omitted, lifetime stats are returned."),
        to: z.string().optional().describe("End date exclusive (YYYY-MM-DD). If omitted, lifetime stats are returned."),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["openid", "profile", "email", "r_member_postAnalytics"],
        },
        async (client) => {
          const dateRange = parseDateRange(args.from, args.to);
          const analytics = await getPostAnalytics(client, {
            postUrn: args.post_urn,
            aggregation: args.aggregation,
            dateRange,
          });

          return {
            content: [{ type: "text" as const, text: JSON.stringify(analytics, null, 2) }],
          };
        },
      );
    },
  );

  server.registerTool(
    "stats_me",
    {
      title: "My Stats",
      description:
        "Get aggregated analytics across all your LinkedIn posts (impressions, reach, reactions, comments, reshares). Requires the Community Management API product (r_member_postAnalytics scope).",
      inputSchema: {
        aggregation: z
          .enum(["DAILY", "TOTAL"])
          .optional()
          .describe("Aggregation mode (defaults to TOTAL). DAILY returns per-day breakdown."),
        from: z
          .string()
          .optional()
          .describe("Start date inclusive (YYYY-MM-DD). If omitted, lifetime totals are returned."),
        to: z
          .string()
          .optional()
          .describe("End date exclusive (YYYY-MM-DD). If omitted, lifetime totals are returned."),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["openid", "profile", "email", "r_member_postAnalytics"],
        },
        async (client) => {
          const dateRange = parseDateRange(args.from, args.to);
          const analytics = await getMemberAnalytics(client, {
            aggregation: args.aggregation,
            dateRange,
          });

          return {
            content: [{ type: "text" as const, text: JSON.stringify(analytics, null, 2) }],
          };
        },
      );
    },
  );

  server.registerTool(
    "stats_org",
    {
      title: "Organization Share Statistics",
      description:
        "Get share statistics for a LinkedIn organization. Returns lifetime aggregate statistics by default. " +
        "When time_granularity and start/end are provided, returns time-bucketed statistics.",
      inputSchema: {
        id: z.string().describe("Organization ID (numeric, e.g. 12345)"),
        time_granularity: z
          .enum(["DAY", "MONTH"])
          .optional()
          .describe("Time granularity for bucketed results (DAY or MONTH). Requires start and end."),
        start: z.string().optional().describe("Start of time range (ISO 8601 date, e.g. 2026-01-01). Requires end."),
        end: z.string().optional().describe("End of time range (ISO 8601 date, e.g. 2026-02-01). Requires start."),
        shares: z.string().optional().describe("Comma-separated share URNs to filter statistics for specific posts"),
        profile: z.string().optional().describe("Profile name to use from config file"),
      },
    },
    async (args) => {
      if (
        (args.start !== undefined || args.end !== undefined) &&
        (args.start === undefined || args.end === undefined)
      ) {
        return {
          content: [{ type: "text" as const, text: "Both start and end must be provided for a time range." }],
          isError: true,
        };
      }

      if (args.time_granularity !== undefined && (args.start === undefined || args.end === undefined)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "time_granularity requires both start and end to be provided.",
            },
          ],
          isError: true,
        };
      }

      return withClient(
        {
          profile: args.profile,
          requiredScopes: ["rw_organization_admin"],
        },
        async (client) => {
          const organizationUrn = `urn:li:organization:${args.id}`;

          const timeGranularity = args.time_granularity;
          const timeRange =
            args.start !== undefined && args.end !== undefined
              ? { start: new Date(args.start).getTime(), end: new Date(args.end).getTime() }
              : undefined;

          const shares =
            args.shares !== undefined
              ? args.shares
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
              : undefined;

          const response = await getOrgStats(client, {
            organizationUrn,
            timeGranularity,
            timeRange,
            shares,
          });

          return {
            content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
          };
        },
      );
    },
  );
}
