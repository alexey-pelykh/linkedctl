// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { ConfigError } from "@linkedctl/core";
import type { AnalyticsDate, MetricResult, PostAnalytics } from "@linkedctl/core";

/**
 * Human-readable labels for each metric key.
 */
const METRIC_LABELS: Record<keyof PostAnalytics, string> = {
  impressions: "Impressions",
  membersReached: "Members reached",
  reactions: "Reactions",
  comments: "Comments",
  reshares: "Reshares",
};

/**
 * Print warnings to stderr for any unavailable or excluded metrics.
 */
export function warnUnavailableMetrics(analytics: PostAnalytics): void {
  const warnings: string[] = [];
  for (const [key, result] of Object.entries(analytics) as [keyof PostAnalytics, MetricResult][]) {
    if (result.status === "unavailable") {
      warnings.push(`${METRIC_LABELS[key]}: ${result.reason}`);
    } else if (result.status === "excluded") {
      warnings.push(`${METRIC_LABELS[key]}: ${result.reason}`);
    }
  }
  if (warnings.length > 0) {
    console.error(`warning: Some metrics are unavailable:\n${warnings.map((w) => `  - ${w}`).join("\n")}`);
  }
}

/**
 * Build table rows for TOTAL aggregation: one row per successful metric.
 */
export function buildTotalRows(analytics: PostAnalytics): { metric: string; count: number }[] {
  const rows: { metric: string; count: number }[] = [];
  for (const [key, result] of Object.entries(analytics) as [keyof PostAnalytics, MetricResult][]) {
    if (result.status === "success") {
      const total = result.dataPoints.reduce((sum, dp) => sum + dp.count, 0);
      rows.push({ metric: METRIC_LABELS[key], count: total });
    }
  }
  return rows;
}

/**
 * Build table rows for DAILY aggregation: one row per date with metric columns.
 */
export function buildDailyRows(analytics: PostAnalytics): Record<string, unknown>[] {
  const dateMap = new Map<string, Record<string, unknown>>();

  for (const [key, result] of Object.entries(analytics) as [keyof PostAnalytics, MetricResult][]) {
    if (result.status !== "success") continue;
    for (const dp of result.dataPoints) {
      if (dp.dateRange?.start === undefined) continue;
      const dateStr = formatDate(dp.dateRange.start);
      let row = dateMap.get(dateStr);
      if (row === undefined) {
        row = { date: dateStr };
        dateMap.set(dateStr, row);
      }
      row[METRIC_LABELS[key]] = dp.count;
    }
  }

  const sortedDates = [...dateMap.keys()].sort();
  return sortedDates.flatMap((date) => {
    const row = dateMap.get(date);
    return row !== undefined ? [row] : [];
  });
}

/**
 * Parse a YYYY-MM-DD string into an AnalyticsDate.
 */
export function parseDate(value: string): AnalyticsDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    throw new Error(`Invalid date format: "${value}". Expected YYYY-MM-DD.`);
  }
  const [, yearStr, monthStr, dayStr] = match;
  if (yearStr === undefined || monthStr === undefined || dayStr === undefined) {
    throw new Error(`Invalid date format: "${value}". Expected YYYY-MM-DD.`);
  }
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date: "${value}". Month must be 1-12, day must be 1-31.`);
  }

  return { year, month, day };
}

/**
 * Format an AnalyticsDate as YYYY-MM-DD.
 */
export function formatDate(date: AnalyticsDate): string {
  return `${String(date.year)}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/**
 * Add one day to an AnalyticsDate, handling month/year boundaries.
 * Used to convert an inclusive --to date to the API's exclusive end date.
 */
export function addDay(date: AnalyticsDate): AnalyticsDate {
  const d = new Date(date.year, date.month - 1, date.day + 1);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

/**
 * Enhance a ConfigError for analytics scope requirements.
 *
 * When the error is about missing `r_member_postAnalytics`, throws a new
 * ConfigError with additional guidance about product exclusivity and
 * a suggested dedicated analytics profile name.
 */
export function enhanceAnalyticsScopeError(error: unknown, profile: string | undefined): void {
  if (!(error instanceof ConfigError)) return;
  if (!error.message.includes("r_member_postAnalytics")) return;

  const profileName = profile !== undefined ? `${profile}-analytics` : "analytics";
  throw new ConfigError(
    error.message +
      ` LinkedIn's Community Management API requires a dedicated Developer App` +
      ` that cannot share scopes with other products.` +
      ` Consider a dedicated analytics profile: linkedctl auth setup --product community-management --profile ${profileName}`,
  );
}
