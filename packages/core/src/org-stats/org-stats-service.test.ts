// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { getOrgStats } from "./org-stats-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";
import type { OrgStatsResponse } from "./types.js";

function mockClient(): LinkedInClient {
  return {
    request: vi.fn(),
  } as unknown as LinkedInClient;
}

const LIFETIME_RESPONSE: OrgStatsResponse = {
  elements: [
    {
      organizationalEntity: "urn:li:organization:123",
      totalShareStatistics: {
        clickCount: 100,
        commentCount: 25,
        engagement: 0.05,
        impressionCount: 1000,
        likeCount: 50,
        shareCount: 10,
        uniqueImpressionsCount: 800,
      },
    },
  ],
  paging: { count: 1, start: 0 },
};

describe("getOrgStats", () => {
  it("fetches lifetime stats with organization URN", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    const result = await getOrgStats(client, {
      organizationUrn: "urn:li:organization:123",
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A123",
    );
    expect(result).toEqual(LIFETIME_RESPONSE);
  });

  it("includes time interval parameters for time-bound queries", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:456",
      timeGranularity: "MONTH",
      timeRange: { start: 1704067200000, end: 1706745600000 },
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A456&timeIntervals.timeGranularityType=MONTH&timeIntervals.timeRange.start=1704067200000&timeIntervals.timeRange.end=1706745600000",
    );
  });

  it("includes time interval parameters for daily granularity", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:789",
      timeGranularity: "DAY",
      timeRange: { start: 1704067200000, end: 1704153600000 },
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A789&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=1704067200000&timeIntervals.timeRange.end=1704153600000",
    );
  });

  it("includes share URNs for per-post filtering", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:123",
      shares: ["urn:li:share:111"],
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A123&shares%5B0%5D=urn%3Ali%3Ashare%3A111",
    );
  });

  it("includes multiple share URNs", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:123",
      shares: ["urn:li:share:111", "urn:li:share:222"],
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A123&shares%5B0%5D=urn%3Ali%3Ashare%3A111&shares%5B1%5D=urn%3Ali%3Ashare%3A222",
    );
  });

  it("combines time intervals and share filtering", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:123",
      timeGranularity: "DAY",
      timeRange: { start: 1704067200000, end: 1704153600000 },
      shares: ["urn:li:share:111"],
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A123&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=1704067200000&timeIntervals.timeRange.end=1704153600000&shares%5B0%5D=urn%3Ali%3Ashare%3A111",
    );
  });

  it("ignores timeGranularity when timeRange is not provided", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:123",
      timeGranularity: "MONTH",
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A123",
    );
  });

  it("ignores timeRange when timeGranularity is not provided", async () => {
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(LIFETIME_RESPONSE);

    await getOrgStats(client, {
      organizationUrn: "urn:li:organization:123",
      timeRange: { start: 1704067200000, end: 1706745600000 },
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A123",
    );
  });
});
