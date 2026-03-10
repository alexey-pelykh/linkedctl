// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Metric types available for the memberCreatorPostAnalytics endpoint.
 */
export type AnalyticsMetricType = "IMPRESSION" | "MEMBERS_REACHED" | "REACTION" | "COMMENT" | "RESHARE";

/**
 * All available analytics metric types.
 */
export const ANALYTICS_METRIC_TYPES: readonly AnalyticsMetricType[] = [
  "IMPRESSION",
  "MEMBERS_REACHED",
  "REACTION",
  "COMMENT",
  "RESHARE",
] as const;

/**
 * Aggregation mode for analytics queries.
 */
export type AnalyticsAggregation = "DAILY" | "TOTAL";

/**
 * A calendar date used in analytics date ranges.
 */
export interface AnalyticsDate {
  year: number;
  month: number;
  day: number;
}

/**
 * A date range for filtering analytics data.
 * Start is inclusive, end is exclusive.
 */
export interface AnalyticsDateRange {
  /** Inclusive start date. */
  start?: AnalyticsDate | undefined;
  /** Exclusive end date. */
  end?: AnalyticsDate | undefined;
}

/**
 * A single analytics data point returned by the API.
 */
export interface AnalyticsDataPoint {
  /** The metric count value. */
  count: number;
  /** The date range this data point covers. */
  dateRange?: AnalyticsDateRange | undefined;
}

/**
 * A metric that was successfully fetched.
 */
export interface MetricSuccess {
  status: "success";
  /** One or more data points for this metric. */
  dataPoints: AnalyticsDataPoint[];
}

/**
 * A metric that failed to fetch due to an API error.
 */
export interface MetricUnavailable {
  status: "unavailable";
  /** Description of why the metric is unavailable. */
  reason: string;
}

/**
 * A metric that was excluded because the requested combination is not supported.
 */
export interface MetricExcluded {
  status: "excluded";
  /** Description of why the metric was excluded. */
  reason: string;
}

/**
 * The result of fetching a single metric type.
 */
export type MetricResult = MetricSuccess | MetricUnavailable | MetricExcluded;

/**
 * Unified analytics results across all 5 metric types.
 */
export interface PostAnalytics {
  impressions: MetricResult;
  membersReached: MetricResult;
  reactions: MetricResult;
  comments: MetricResult;
  reshares: MetricResult;
}

/**
 * Internal API response element from the memberCreatorPostAnalytics endpoint.
 * @internal
 */
export interface MemberCreatorPostAnalyticsApiElement {
  count: number;
  metricType: {
    "com.linkedin.adsexternalapi.memberanalytics.v1.CreatorPostAnalyticsMetricTypeV1": string;
  };
  targetEntity?: Record<string, string> | undefined;
  dateRange?:
    | {
        start: AnalyticsDate;
        end: AnalyticsDate;
      }
    | undefined;
}

/**
 * Internal API response from the memberCreatorPostAnalytics endpoint.
 * @internal
 */
export interface MemberCreatorPostAnalyticsApiResponse {
  elements: MemberCreatorPostAnalyticsApiElement[];
  paging: {
    count: number;
    start: number;
    links: unknown[];
  };
}
