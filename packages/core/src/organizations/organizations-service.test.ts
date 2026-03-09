// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { listOrganizations, getOrganization, getOrganizationFollowerCount } from "./organizations-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";
import type { OrganizationAclListResponse, OrganizationData, OrganizationFollowerCountResponse } from "./types.js";

function mockClient(): LinkedInClient {
  return {
    request: vi.fn(),
  } as unknown as LinkedInClient;
}

describe("listOrganizations", () => {
  it("calls client.request with default pagination", async () => {
    const response: OrganizationAclListResponse = {
      elements: [{ organization: "urn:li:organization:123", role: "ADMINISTRATOR", state: "APPROVED" }],
      paging: { count: 10, start: 0, total: 1 },
    };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(response);

    const result = await listOrganizations(client);

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=10&start=0",
    );
    expect(result).toEqual(response);
  });

  it("uses custom count and start values", async () => {
    const response: OrganizationAclListResponse = {
      elements: [],
      paging: { count: 5, start: 10 },
    };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(response);

    await listOrganizations(client, { count: 5, start: 10 });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=5&start=10",
    );
  });

  it("defaults to count=10 and start=0 when options are undefined", async () => {
    const response: OrganizationAclListResponse = {
      elements: [],
      paging: { count: 10, start: 0 },
    };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(response);

    await listOrganizations(client, undefined);

    expect(client.request).toHaveBeenCalledWith(
      "/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=10&start=0",
    );
  });
});

describe("getOrganization", () => {
  it("calls client.request with organization ID", async () => {
    const orgData: OrganizationData = {
      id: 12345,
      localizedName: "Acme Corp",
      localizedDescription: "A great company",
      vanityName: "acme-corp",
    };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(orgData);

    const result = await getOrganization(client, "12345");

    expect(client.request).toHaveBeenCalledWith("/rest/organizations/12345");
    expect(result).toEqual(orgData);
  });

  it("URL-encodes the organization ID", async () => {
    const orgData: OrganizationData = {
      id: 123,
      localizedName: "Test Org",
    };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(orgData);

    await getOrganization(client, "123");

    expect(client.request).toHaveBeenCalledWith("/rest/organizations/123");
  });
});

describe("getOrganizationFollowerCount", () => {
  it("calls client.request with encoded URN and edgeType", async () => {
    const response: OrganizationFollowerCountResponse = { firstDegreeSize: 5000 };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(response);

    const count = await getOrganizationFollowerCount(client, "urn:li:organization:12345");

    expect(client.request).toHaveBeenCalledWith(
      "/rest/networkSizes/urn%3Ali%3Aorganization%3A12345?edgeType=COMPANY_FOLLOWED_BY_MEMBER",
    );
    expect(count).toBe(5000);
  });

  it("returns 0 when organization has no followers", async () => {
    const response: OrganizationFollowerCountResponse = { firstDegreeSize: 0 };
    const client = mockClient();
    vi.mocked(client.request).mockResolvedValue(response);

    const count = await getOrganizationFollowerCount(client, "urn:li:organization:99999");

    expect(count).toBe(0);
  });
});
