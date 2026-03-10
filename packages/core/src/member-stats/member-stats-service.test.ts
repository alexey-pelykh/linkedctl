// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { LinkedInRateLimitError } from "../http/errors.js";
import type { LinkedInClient } from "../http/linkedin-client.js";
import { getPostAnalytics, getMemberAnalytics } from "./member-stats-service.js";
import type {
  MemberCreatorPostAnalyticsApiResponse,
  MetricExcluded,
  MetricSuccess,
  MetricUnavailable,
} from "./types.js";

const METRIC_TYPE_KEY = "com.linkedin.adsexternalapi.memberanalytics.v1.CreatorPostAnalyticsMetricTypeV1";

function mockClient(): LinkedInClient {
  return {
    request: vi.fn(),
  } as unknown as LinkedInClient;
}

function apiResponse(count: number, metricType: string): MemberCreatorPostAnalyticsApiResponse {
  return {
    elements: [
      {
        count,
        metricType: { [METRIC_TYPE_KEY]: metricType },
      },
    ],
    paging: { count: 10, start: 0, links: [] },
  };
}

function apiResponseWithDateRange(
  count: number,
  metricType: string,
  start: { year: number; month: number; day: number },
  end: { year: number; month: number; day: number },
): MemberCreatorPostAnalyticsApiResponse {
  return {
    elements: [
      {
        count,
        metricType: { [METRIC_TYPE_KEY]: metricType },
        dateRange: { start, end },
      },
    ],
    paging: { count: 10, start: 0, links: [] },
  };
}

function mockAllMetricsSuccess(client: LinkedInClient): void {
  const request = vi.mocked(client.request);
  request.mockResolvedValueOnce(apiResponse(100, "IMPRESSION"));
  request.mockResolvedValueOnce(apiResponse(80, "MEMBERS_REACHED"));
  request.mockResolvedValueOnce(apiResponse(25, "REACTION"));
  request.mockResolvedValueOnce(apiResponse(10, "COMMENT"));
  request.mockResolvedValueOnce(apiResponse(5, "RESHARE"));
}

describe("getPostAnalytics", () => {
  it("fetches all 5 metrics with TOTAL aggregation by default", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    const result = await getPostAnalytics(client, { postUrn: "urn:li:share:123" });

    expect(client.request).toHaveBeenCalledTimes(5);
    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=IMPRESSION&aggregation=TOTAL&entity=(share:urn%3Ali%3Ashare%3A123)",
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=MEMBERS_REACHED&aggregation=TOTAL&entity=(share:urn%3Ali%3Ashare%3A123)",
    );
    expect(client.request).toHaveBeenNthCalledWith(
      3,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=REACTION&aggregation=TOTAL&entity=(share:urn%3Ali%3Ashare%3A123)",
    );
    expect(client.request).toHaveBeenNthCalledWith(
      4,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=COMMENT&aggregation=TOTAL&entity=(share:urn%3Ali%3Ashare%3A123)",
    );
    expect(client.request).toHaveBeenNthCalledWith(
      5,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=RESHARE&aggregation=TOTAL&entity=(share:urn%3Ali%3Ashare%3A123)",
    );

    expect((result.impressions as MetricSuccess).status).toBe("success");
    expect((result.impressions as MetricSuccess).dataPoints).toEqual([{ count: 100 }]);
    expect((result.membersReached as MetricSuccess).dataPoints).toEqual([{ count: 80 }]);
    expect((result.reactions as MetricSuccess).dataPoints).toEqual([{ count: 25 }]);
    expect((result.comments as MetricSuccess).dataPoints).toEqual([{ count: 10 }]);
    expect((result.reshares as MetricSuccess).dataPoints).toEqual([{ count: 5 }]);
  });

  it("encodes ugcPost URNs with ugc prefix", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getPostAnalytics(client, { postUrn: "urn:li:ugcPost:456" });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=IMPRESSION&aggregation=TOTAL&entity=(ugc:urn%3Ali%3AugcPost%3A456)",
    );
  });

  it("includes dateRange in REST.li record format", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getPostAnalytics(client, {
      postUrn: "urn:li:share:123",
      dateRange: {
        start: { year: 2024, month: 5, day: 4 },
        end: { year: 2024, month: 5, day: 6 },
      },
    });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "/rest/memberCreatorPostAnalytics?q=entity&queryType=IMPRESSION&aggregation=TOTAL&entity=(share:urn%3Ali%3Ashare%3A123)&dateRange=(start:(day:4,month:5,year:2024),end:(day:6,month:5,year:2024))",
    );
  });

  it("maps response elements with dateRange to data points", async () => {
    const client = mockClient();
    const start = { year: 2024, month: 5, day: 4 };
    const end = { year: 2024, month: 5, day: 5 };
    vi.mocked(client.request).mockResolvedValueOnce(apiResponseWithDateRange(10, "IMPRESSION", start, end));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(80, "MEMBERS_REACHED"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(25, "REACTION"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(10, "COMMENT"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(5, "RESHARE"));

    const result = await getPostAnalytics(client, { postUrn: "urn:li:share:123" });

    expect((result.impressions as MetricSuccess).dataPoints).toEqual([{ count: 10, dateRange: { start, end } }]);
  });

  it("excludes MEMBERS_REACHED and IMPRESSION with DAILY aggregation", async () => {
    const client = mockClient();
    // Only 3 calls expected: REACTION, COMMENT, RESHARE
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(25, "REACTION"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(10, "COMMENT"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(5, "RESHARE"));

    const result = await getPostAnalytics(client, {
      postUrn: "urn:li:share:123",
      aggregation: "DAILY",
    });

    expect(client.request).toHaveBeenCalledTimes(3);
    expect(result.impressions.status).toBe("excluded");
    expect((result.impressions as MetricExcluded).reason).toContain("IMPRESSION");
    expect(result.membersReached.status).toBe("excluded");
    expect((result.membersReached as MetricExcluded).reason).toContain("MEMBERS_REACHED");
    expect((result.reactions as MetricSuccess).dataPoints).toEqual([{ count: 25 }]);
  });

  it("reports failed metric as unavailable on non-429 error", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(100, "IMPRESSION"));
    vi.mocked(client.request).mockRejectedValueOnce(new Error("LinkedIn API request failed (HTTP 403)"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(25, "REACTION"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(10, "COMMENT"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(5, "RESHARE"));

    const result = await getPostAnalytics(client, { postUrn: "urn:li:share:123" });

    expect(result.impressions.status).toBe("success");
    expect(result.membersReached.status).toBe("unavailable");
    expect((result.membersReached as MetricUnavailable).reason).toContain("403");
    expect(result.reactions.status).toBe("success");
  });

  it("throws when all metric requests fail", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockRejectedValue(new Error("Service unavailable"));

    await expect(getPostAnalytics(client, { postUrn: "urn:li:share:123" })).rejects.toThrow(
      "All metric requests failed",
    );
  });

  it("propagates LinkedInRateLimitError immediately", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(100, "IMPRESSION"));
    vi.mocked(client.request).mockRejectedValueOnce(new LinkedInRateLimitError("Rate limited", 3));

    await expect(getPostAnalytics(client, { postUrn: "urn:li:share:123" })).rejects.toThrow(LinkedInRateLimitError);

    // Should stop after 2 calls (did not continue to remaining metrics)
    expect(client.request).toHaveBeenCalledTimes(2);
  });

  it("uses explicit TOTAL aggregation when specified", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getPostAnalytics(client, { postUrn: "urn:li:share:123", aggregation: "TOTAL" });

    expect(client.request).toHaveBeenNthCalledWith(1, expect.stringContaining("aggregation=TOTAL"));
  });
});

describe("getMemberAnalytics", () => {
  it("fetches all 5 metrics with q=me and TOTAL aggregation", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    const result = await getMemberAnalytics(client);

    expect(client.request).toHaveBeenCalledTimes(5);
    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "/rest/memberCreatorPostAnalytics?q=me&queryType=IMPRESSION&aggregation=TOTAL",
    );
    expect(client.request).toHaveBeenNthCalledWith(
      2,
      "/rest/memberCreatorPostAnalytics?q=me&queryType=MEMBERS_REACHED&aggregation=TOTAL",
    );
    expect((result.impressions as MetricSuccess).dataPoints).toEqual([{ count: 100 }]);
    expect((result.reshares as MetricSuccess).dataPoints).toEqual([{ count: 5 }]);
  });

  it("includes dateRange parameter for aggregate stats", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getMemberAnalytics(client, {
      dateRange: {
        start: { year: 2024, month: 1, day: 1 },
        end: { year: 2024, month: 12, day: 31 },
      },
    });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "/rest/memberCreatorPostAnalytics?q=me&queryType=IMPRESSION&aggregation=TOTAL&dateRange=(start:(day:1,month:1,year:2024),end:(day:31,month:12,year:2024))",
    );
  });

  it("excludes MEMBERS_REACHED with DAILY aggregation but keeps IMPRESSION", async () => {
    const client = mockClient();
    // 4 calls: IMPRESSION, REACTION, COMMENT, RESHARE (MEMBERS_REACHED excluded)
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(100, "IMPRESSION"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(25, "REACTION"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(10, "COMMENT"));
    vi.mocked(client.request).mockResolvedValueOnce(apiResponse(5, "RESHARE"));

    const result = await getMemberAnalytics(client, { aggregation: "DAILY" });

    expect(client.request).toHaveBeenCalledTimes(4);
    expect(result.impressions.status).toBe("success");
    expect(result.membersReached.status).toBe("excluded");
    expect((result.membersReached as MetricExcluded).reason).toContain("MEMBERS_REACHED");
  });

  it("defaults to TOTAL aggregation when no options provided", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getMemberAnalytics(client);

    expect(client.request).toHaveBeenNthCalledWith(1, expect.stringContaining("aggregation=TOTAL"));
  });

  it("returns lifetime totals when no dateRange is specified", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getMemberAnalytics(client);

    // Verify no dateRange parameter in the URL
    for (let i = 1; i <= 5; i++) {
      expect(client.request).toHaveBeenNthCalledWith(i, expect.not.stringContaining("dateRange"));
    }
  });

  it("throws when all metric requests fail", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockRejectedValue(new Error("Internal server error"));

    await expect(getMemberAnalytics(client)).rejects.toThrow("All metric requests failed");
  });

  it("propagates LinkedInRateLimitError immediately", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockRejectedValueOnce(new LinkedInRateLimitError("Rate limited", 3));

    await expect(getMemberAnalytics(client)).rejects.toThrow(LinkedInRateLimitError);
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it("supports dateRange with only start date", async () => {
    const client = mockClient();
    mockAllMetricsSuccess(client);

    await getMemberAnalytics(client, {
      dateRange: { start: { year: 2024, month: 6, day: 1 } },
    });

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      "/rest/memberCreatorPostAnalytics?q=me&queryType=IMPRESSION&aggregation=TOTAL&dateRange=(start:(day:1,month:6,year:2024))",
    );
  });
});
