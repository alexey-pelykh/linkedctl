// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Time granularity for organization share statistics time intervals.
 */
export type OrgStatsTimeGranularity = "DAY" | "MONTH";

/**
 * A time range with start and end timestamps (milliseconds since epoch).
 */
export interface TimeRange {
  /** Start of the time range (ms since epoch, inclusive). */
  start: number;
  /** End of the time range (ms since epoch, exclusive). */
  end: number;
}

/**
 * Aggregate share statistics for an organization or a specific share.
 */
export interface ShareStatistics {
  /** Number of clicks on the share. */
  clickCount: number;
  /** Number of comments on the share. */
  commentCount: number;
  /** Engagement rate (interactions / impressions). */
  engagement: number;
  /** Number of impressions (total views). */
  impressionCount: number;
  /** Number of likes (reactions) on the share. */
  likeCount: number;
  /** Number of times the share was re-shared. */
  shareCount: number;
  /** Number of unique impressions (unique viewers). */
  uniqueImpressionsCount: number;
}

/**
 * A single element in the organization share statistics response.
 */
export interface OrgStatsElement {
  /** Organization URN (e.g. `urn:li:organization:123`). */
  organizationalEntity: string;
  /** Share URN, present when filtering by specific share. */
  share?: string | undefined;
  /** Aggregate share statistics. */
  totalShareStatistics: ShareStatistics;
  /** Time range for this statistics bucket (present for time-bound queries). */
  timeRange?: TimeRange | undefined;
}

/**
 * Response from the organizationalEntityShareStatistics endpoint.
 */
export interface OrgStatsResponse {
  /** Array of statistics elements. */
  elements: OrgStatsElement[];
  /** Paging metadata. */
  paging: {
    /** Number of results returned. */
    count: number;
    /** Starting index. */
    start: number;
    /** Total number of results available. */
    total?: number | undefined;
  };
}
