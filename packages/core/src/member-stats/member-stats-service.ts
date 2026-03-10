// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { LinkedInRateLimitError } from "../http/errors.js";
import type { LinkedInClient } from "../http/linkedin-client.js";
import type {
  AnalyticsAggregation,
  AnalyticsDataPoint,
  AnalyticsDateRange,
  AnalyticsMetricType,
  MemberCreatorPostAnalyticsApiElement,
  MemberCreatorPostAnalyticsApiResponse,
  MetricResult,
  PostAnalytics,
} from "./types.js";
import { ANALYTICS_METRIC_TYPES } from "./types.js";

/**
 * Options for fetching analytics for a single post.
 */
export interface GetPostAnalyticsOptions {
  /** Post URN (e.g. `urn:li:share:123` or `urn:li:ugcPost:123`). */
  postUrn: string;
  /** Aggregation mode. Defaults to `"TOTAL"`. */
  aggregation?: AnalyticsAggregation | undefined;
  /** Optional date range filter. If omitted, lifetime stats are returned. */
  dateRange?: AnalyticsDateRange | undefined;
}

/**
 * Options for fetching aggregated analytics across all member posts.
 */
export interface GetMemberAnalyticsOptions {
  /** Aggregation mode. Defaults to `"TOTAL"`. */
  aggregation?: AnalyticsAggregation | undefined;
  /** Optional date range filter. If omitted, lifetime stats are returned. */
  dateRange?: AnalyticsDateRange | undefined;
}

/**
 * Fetch analytics for a single post across all 5 metric types.
 *
 * Calls are made serially to avoid thundering herd on rate limits.
 * Partial failures are tolerated: successful metrics are returned
 * alongside failed ones marked as unavailable.
 *
 * @throws {LinkedInRateLimitError} If rate limiting persists after retries.
 * @throws {Error} If all metric requests fail.
 */
export async function getPostAnalytics(
  client: LinkedInClient,
  options: GetPostAnalyticsOptions,
): Promise<PostAnalytics> {
  const aggregation = options.aggregation ?? "TOTAL";
  return fetchAllMetrics(client, "entity", aggregation, options.dateRange, options.postUrn);
}

/**
 * Fetch aggregated analytics across all member posts for all 5 metric types.
 *
 * Calls are made serially to avoid thundering herd on rate limits.
 * Partial failures are tolerated: successful metrics are returned
 * alongside failed ones marked as unavailable.
 *
 * @throws {LinkedInRateLimitError} If rate limiting persists after retries.
 * @throws {Error} If all metric requests fail.
 */
export async function getMemberAnalytics(
  client: LinkedInClient,
  options?: GetMemberAnalyticsOptions,
): Promise<PostAnalytics> {
  const aggregation = options?.aggregation ?? "TOTAL";
  return fetchAllMetrics(client, "me", aggregation, options?.dateRange);
}

/**
 * Serial fan-out across all metric types with partial failure handling.
 */
async function fetchAllMetrics(
  client: LinkedInClient,
  finder: "entity" | "me",
  aggregation: AnalyticsAggregation,
  dateRange?: AnalyticsDateRange,
  postUrn?: string,
): Promise<PostAnalytics> {
  const results = new Map<AnalyticsMetricType, MetricResult>();

  for (const metricType of ANALYTICS_METRIC_TYPES) {
    // MEMBERS_REACHED + DAILY is not supported by the API
    if (metricType === "MEMBERS_REACHED" && aggregation === "DAILY") {
      results.set(metricType, {
        status: "excluded",
        reason: "MEMBERS_REACHED with DAILY aggregation is not supported by the LinkedIn API",
      });
      continue;
    }

    // IMPRESSION + DAILY is not supported for single post analytics (q=entity)
    if (metricType === "IMPRESSION" && aggregation === "DAILY" && finder === "entity") {
      results.set(metricType, {
        status: "excluded",
        reason: "IMPRESSION with DAILY aggregation is not supported for single post analytics",
      });
      continue;
    }

    try {
      const url = buildMetricUrl(finder, metricType, aggregation, dateRange, postUrn);
      const response = await client.request<MemberCreatorPostAnalyticsApiResponse>(url);
      results.set(metricType, {
        status: "success",
        dataPoints: response.elements.map(mapDataPoint),
      });
    } catch (error: unknown) {
      // Rate limit errors indicate a systemic issue; stop execution and propagate.
      if (error instanceof LinkedInRateLimitError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      results.set(metricType, {
        status: "unavailable",
        reason: message,
      });
    }
  }

  // If no metrics succeeded and at least one was attempted (unavailable), throw.
  const hasSuccess = ANALYTICS_METRIC_TYPES.some((m) => results.get(m)?.status === "success");
  const hasUnavailable = ANALYTICS_METRIC_TYPES.some((m) => results.get(m)?.status === "unavailable");
  if (!hasSuccess && hasUnavailable) {
    throw new Error("All metric requests failed");
  }

  return {
    impressions: getMetricResult(results, "IMPRESSION"),
    membersReached: getMetricResult(results, "MEMBERS_REACHED"),
    reactions: getMetricResult(results, "REACTION"),
    comments: getMetricResult(results, "COMMENT"),
    reshares: getMetricResult(results, "RESHARE"),
  };
}

function getMetricResult(results: Map<AnalyticsMetricType, MetricResult>, key: AnalyticsMetricType): MetricResult {
  const result = results.get(key);
  if (result === undefined) {
    throw new Error(`Missing metric result for ${key}`);
  }
  return result;
}

/**
 * Build the request URL for a single metric query.
 */
function buildMetricUrl(
  finder: "entity" | "me",
  queryType: AnalyticsMetricType,
  aggregation: AnalyticsAggregation,
  dateRange?: AnalyticsDateRange,
  postUrn?: string,
): string {
  const parts = [`q=${finder}`, `queryType=${queryType}`, `aggregation=${aggregation}`];

  if (finder === "entity" && postUrn !== undefined) {
    parts.push(`entity=${encodeEntityUrn(postUrn)}`);
  }

  if (dateRange !== undefined) {
    parts.push(`dateRange=${encodeDateRange(dateRange)}`);
  }

  return `/rest/memberCreatorPostAnalytics?${parts.join("&")}`;
}

/**
 * Encode a post URN into REST.li compound key format for the entity parameter.
 *
 * - `urn:li:share:123` → `(share:urn%3Ali%3Ashare%3A123)`
 * - `urn:li:ugcPost:123` → `(ugc:urn%3Ali%3AugcPost%3A123)`
 */
function encodeEntityUrn(urn: string): string {
  const encodedUrn = urn.replaceAll(":", "%3A");
  if (urn.startsWith("urn:li:ugcPost:")) {
    return `(ugc:${encodedUrn})`;
  }
  return `(share:${encodedUrn})`;
}

/**
 * Encode a date range into REST.li record literal format.
 *
 * Example: `(start:(day:4,month:5,year:2024),end:(day:6,month:5,year:2024))`
 */
function encodeDateRange(dateRange: AnalyticsDateRange): string {
  const parts: string[] = [];
  if (dateRange.start !== undefined) {
    parts.push(
      `start:(day:${String(dateRange.start.day)},month:${String(dateRange.start.month)},year:${String(dateRange.start.year)})`,
    );
  }
  if (dateRange.end !== undefined) {
    parts.push(
      `end:(day:${String(dateRange.end.day)},month:${String(dateRange.end.month)},year:${String(dateRange.end.year)})`,
    );
  }
  return `(${parts.join(",")})`;
}

/**
 * Map an API response element to a public data point.
 */
function mapDataPoint(element: MemberCreatorPostAnalyticsApiElement): AnalyticsDataPoint {
  const dataPoint: AnalyticsDataPoint = {
    count: element.count,
  };
  if (element.dateRange !== undefined) {
    dataPoint.dateRange = {
      start: element.dateRange.start,
      end: element.dateRange.end,
    };
  }
  return dataPoint;
}
