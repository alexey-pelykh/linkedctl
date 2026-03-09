// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { OrganizationAclListResponse, OrganizationData, OrganizationFollowerCountResponse } from "./types.js";

/**
 * Options for listing organizations administered by the current user.
 */
export interface ListOrganizationsOptions {
  /** Number of results to return (default 10, max 100). */
  count?: number | undefined;
  /** Starting index for pagination (default 0). */
  start?: number | undefined;
}

/**
 * List organizations the authenticated member administers.
 */
export async function listOrganizations(
  client: LinkedInClient,
  options?: ListOrganizationsOptions,
): Promise<OrganizationAclListResponse> {
  const count = options?.count ?? 10;
  const start = options?.start ?? 0;
  return client.request<OrganizationAclListResponse>(
    `/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=${String(count)}&start=${String(start)}`,
  );
}

/**
 * Fetch a single organization by ID.
 */
export async function getOrganization(client: LinkedInClient, organizationId: string): Promise<OrganizationData> {
  return client.request<OrganizationData>(`/rest/organizations/${encodeURIComponent(organizationId)}`);
}

/**
 * Get the follower count for an organization.
 */
export async function getOrganizationFollowerCount(client: LinkedInClient, organizationUrn: string): Promise<number> {
  const encodedUrn = encodeURIComponent(organizationUrn);
  const response = await client.request<OrganizationFollowerCountResponse>(
    `/rest/networkSizes/${encodedUrn}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
  );
  return response.firstDegreeSize;
}
