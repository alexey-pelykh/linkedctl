// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { resolveConfig, LinkedInClient, LinkedInAuthError } from "@linkedctl/core";

export async function withClient(
  options: { profile?: string | undefined; requiredScopes: string[] },
  fn: (client: LinkedInClient) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>,
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const { config } = await resolveConfig({
    profile: options.profile,
    requiredScopes: options.requiredScopes,
  });
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  try {
    return await fn(client);
  } catch (error: unknown) {
    if (error instanceof LinkedInAuthError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Authentication failed: ${error.message}\nRun "linkedctl auth login" to re-authenticate.`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
