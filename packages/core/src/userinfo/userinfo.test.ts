// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkedInClient } from "../http/linkedin-client.js";
import { getUserInfo } from "./userinfo.js";
import type { UserInfo } from "./userinfo.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SAMPLE_USERINFO: UserInfo = {
  sub: "abc123",
  name: "Jane Doe",
  given_name: "Jane",
  family_name: "Doe",
  picture: "https://media.licdn.com/dms/image/example.jpg",
  email: "jane@example.com",
  email_verified: true,
};

describe("getUserInfo", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the /v2/userinfo endpoint and returns the response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(SAMPLE_USERINFO));

    const client = new LinkedInClient({ accessToken: "test-token", apiVersion: "202603" });
    const result = await getUserInfo(client);

    expect(result).toEqual(SAMPLE_USERINFO);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe("https://api.linkedin.com/v2/userinfo");
  });

  it("returns userinfo with locale when present", async () => {
    const withLocale = { ...SAMPLE_USERINFO, locale: { country: "US", language: "en" } };
    fetchSpy.mockResolvedValueOnce(jsonResponse(withLocale));

    const client = new LinkedInClient({ accessToken: "test-token", apiVersion: "202603" });
    const result = await getUserInfo(client);

    expect(result.locale).toEqual({ country: "US", language: "en" });
  });
});
