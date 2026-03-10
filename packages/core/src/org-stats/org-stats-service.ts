// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { OrgStatsResponse, OrgStatsTimeGranularity, TimeRange } from "./types.js";

/**
 * Options for fetching organization share statistics.
 */
export interface GetOrgStatsOptions {
  /** Organization URN (e.g. `urn:li:organization:123`). */
  organizationUrn: string;
  /** Time granularity for bucketed results. Requires {@link timeRange}. */
  timeGranularity?: OrgStatsTimeGranularity | undefined;
  /** Time range to filter statistics. Requires {@link timeGranularity}. */
  timeRange?: TimeRange | undefined;
  /** Share URNs to filter statistics for specific posts. */
  shares?: string[] | undefined;
}

/**
 * Fetch organization share statistics from the LinkedIn API.
 *
 * Returns lifetime aggregate statistics by default. When {@link GetOrgStatsOptions.timeRange}
 * and {@link GetOrgStatsOptions.timeGranularity} are provided, returns time-bucketed statistics.
 * When {@link GetOrgStatsOptions.shares} are provided, returns per-share statistics.
 *
 * @param client - Authenticated LinkedIn API client.
 * @param options - Query options for the statistics endpoint.
 * @returns Organization share statistics response.
 */
export async function getOrgStats(client: LinkedInClient, options: GetOrgStatsOptions): Promise<OrgStatsResponse> {
  const params = new URLSearchParams();
  params.set("q", "organizationalEntity");
  params.set("organizationalEntity", options.organizationUrn);

  if (options.timeGranularity !== undefined && options.timeRange !== undefined) {
    params.set("timeIntervals.timeGranularityType", options.timeGranularity);
    params.set("timeIntervals.timeRange.start", String(options.timeRange.start));
    params.set("timeIntervals.timeRange.end", String(options.timeRange.end));
  }

  if (options.shares !== undefined) {
    for (const [i, share] of options.shares.entries()) {
      params.set(`shares[${String(i)}]`, share);
    }
  }

  return client.request<OrgStatsResponse>(`/rest/organizationalEntityShareStatistics?${params.toString()}`);
}
