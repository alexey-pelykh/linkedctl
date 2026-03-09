// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkedInClient } from "./linkedin-client.js";
import {
  LinkedInApiError,
  LinkedInAuthError,
  LinkedInRateLimitError,
  LinkedInServerError,
  LinkedInUpgradeRequiredError,
} from "./errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

const CLIENT_OPTIONS = {
  accessToken: "test-token",
  apiVersion: "202601",
  userAgent: "test-agent",
} as const;

/** Stub the private `sleep` method on a client so retries don't wait. */
function stubSleep(client: LinkedInClient) {
  return vi.spyOn(client as never, "sleep" as never).mockImplementation((() => Promise.resolve()) as never);
}

describe("LinkedInClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("headers", () => {
    it("sends Authorization, LinkedIn-Version, X-Restli-Protocol-Version, and User-Agent", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      await client.request("/test");

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [, init] = fetchSpy.mock.calls[0];
      const headers = init.headers;

      expect(headers.get("Authorization")).toBe("Bearer test-token");
      expect(headers.get("LinkedIn-Version")).toBe("202601");
      expect(headers.get("X-Restli-Protocol-Version")).toBe("2.0.0");
      expect(headers.get("User-Agent")).toBe("test-agent");
    });

    it("uses default user agent when not specified", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      const client = new LinkedInClient({
        accessToken: "token",
        apiVersion: "202601",
      });
      await client.request("/test");

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers.get("User-Agent")).toBe("linkedctl");
    });

    it("constructs URL from base URL and path", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      await client.request("/v2/me");

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.linkedin.com/v2/me");
    });

    it("uses custom base URL when provided", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      const client = new LinkedInClient({
        ...CLIENT_OPTIONS,
        baseUrl: "https://custom.api.example.com",
      });
      await client.request("/v2/me");

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://custom.api.example.com/v2/me");
    });

    it("preserves caller-supplied headers alongside required ones", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      await client.request("/test", {
        headers: { "X-Custom": "value" },
      });

      const [, init] = fetchSpy.mock.calls[0];
      const headers = init.headers;
      expect(headers.get("X-Custom")).toBe("value");
      expect(headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("forwards request init options (method, body)", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      const body = JSON.stringify({ text: "hello" });
      await client.request("/v2/posts", { method: "POST", body });

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(init.body).toBe(body);
    });
  });

  describe("successful responses", () => {
    it("returns parsed JSON body", async () => {
      const data = { id: "123", name: "Test" };
      fetchSpy.mockResolvedValueOnce(jsonResponse(data));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      const result = await client.request("/v2/me");

      expect(result).toEqual(data);
    });

    it("returns undefined for 204 No Content", async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse(204));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      const result = await client.request("/v2/resource");

      expect(result).toBeUndefined();
    });
  });

  describe("401 authentication error", () => {
    it("throws LinkedInAuthError with re-authenticate message", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ message: "Invalid token" }, 401));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInAuthError);
      await expect(client.request("/v2/me")).rejects.toThrow(/re-authenticate/);
    });

    it("includes response body in error", async () => {
      const errorBody = { message: "Token expired" };
      fetchSpy.mockResolvedValueOnce(jsonResponse(errorBody, 401));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      try {
        await client.request("/v2/me");
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(LinkedInAuthError);
        expect((error as LinkedInAuthError).responseBody).toEqual(errorBody);
      }
    });

    it("does not retry on 401", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 401));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInAuthError);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });
  });

  describe("426 upgrade required", () => {
    it("throws LinkedInUpgradeRequiredError with api version in message", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, 426));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInUpgradeRequiredError);
      await expect(client.request("/v2/me")).rejects.toThrow(/202601/);
    });

    it("does not retry on 426", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 426));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInUpgradeRequiredError);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it("includes response body in error", async () => {
      const errorBody = { message: "Upgrade Required" };
      fetchSpy.mockResolvedValueOnce(jsonResponse(errorBody, 426));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      try {
        await client.request("/v2/me");
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(LinkedInUpgradeRequiredError);
        expect((error as LinkedInUpgradeRequiredError).responseBody).toEqual(errorBody);
      }
    });
  });

  describe("5xx server errors", () => {
    it("throws LinkedInServerError with status", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: "internal" }, 500));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInServerError);
    });

    it("includes HTTP status code in message", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 503));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(/503/);
    });

    it("handles various 5xx status codes", async () => {
      for (const status of [500, 502, 503]) {
        fetchSpy.mockResolvedValueOnce(jsonResponse({}, status));

        const client = new LinkedInClient(CLIENT_OPTIONS);

        try {
          await client.request("/test");
          expect.fail("should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(LinkedInServerError);
          expect((error as LinkedInServerError).status).toBe(status);
        }
      }
    });

    it("does not retry on 5xx", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 500));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInServerError);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });
  });

  describe("other error status codes", () => {
    it("throws LinkedInApiError for 4xx (non-401, non-429)", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 403));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInApiError);
    });

    it("includes status code in message", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 404));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.request("/v2/me")).rejects.toThrow(/404/);
    });
  });

  describe("429 rate limiting with exponential backoff", () => {
    it("retries up to maxRetries times then throws LinkedInRateLimitError", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, 429));

      const client = new LinkedInClient({ ...CLIENT_OPTIONS, maxRetries: 3 });
      stubSleep(client);

      await expect(client.request("/v2/me")).rejects.toThrow(LinkedInRateLimitError);
      // 1 initial + 3 retries = 4 total attempts
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it("returns successfully if a retry succeeds", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 429)).mockResolvedValueOnce(jsonResponse({ id: "success" }));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      stubSleep(client);

      const result = await client.request("/v2/me");

      expect(result).toEqual({ id: "success" });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("reports retries exhausted count in error", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, 429));

      const client = new LinkedInClient({ ...CLIENT_OPTIONS, maxRetries: 2 });
      stubSleep(client);

      try {
        await client.request("/v2/me");
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(LinkedInRateLimitError);
        // 3 total attempts: initial (1) + 2 retries → final attempt index+1 = 3
        expect((error as LinkedInRateLimitError).retriesExhausted).toBe(3);
      }
    });

    it("applies increasing delays between retries", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, 429));

      const sleepCalls: number[] = [];
      const client = new LinkedInClient({ ...CLIENT_OPTIONS, maxRetries: 3 });

      vi.spyOn(client as never, "sleep" as never).mockImplementation(((ms: number) => {
        sleepCalls.push(ms);
        return Promise.resolve();
      }) as never);

      try {
        await client.request("/v2/me");
      } catch {
        // Expected to throw after exhausting retries.
      }

      expect(sleepCalls).toHaveLength(3);
      // Each successive delay should be larger (exponential growth).
      for (let i = 1; i < sleepCalls.length; i++) {
        const previous = sleepCalls[i - 1];
        expect(previous).toBeDefined();
        expect(sleepCalls[i]).toBeGreaterThan(previous as number);
      }
    });
  });

  describe("error response body handling", () => {
    it("includes JSON error body in thrown error", async () => {
      const errorBody = { code: "FORBIDDEN", message: "Access denied" };
      fetchSpy.mockResolvedValueOnce(jsonResponse(errorBody, 403));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      try {
        await client.request("/v2/me");
        expect.fail("should have thrown");
      } catch (error) {
        expect((error as LinkedInApiError).responseBody).toEqual(errorBody);
      }
    });

    it("falls back to text body when JSON parsing fails", async () => {
      fetchSpy.mockResolvedValueOnce(textResponse("Bad Gateway", 502));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      try {
        await client.request("/v2/me");
        expect.fail("should have thrown");
      } catch (error) {
        expect((error as LinkedInServerError).responseBody).toBe("Bad Gateway");
      }
    });

    it("sets responseBody to undefined when body is unreadable", async () => {
      const response = emptyResponse(400);
      // Simulate text() failing (body unreadable).
      vi.spyOn(response, "text").mockRejectedValue(new Error("no body"));
      fetchSpy.mockResolvedValueOnce(response);

      const client = new LinkedInClient(CLIENT_OPTIONS);

      try {
        await client.request("/test");
        expect.fail("should have thrown");
      } catch (error) {
        expect((error as LinkedInApiError).responseBody).toBeUndefined();
      }
    });
  });

  describe("create", () => {
    it("sends POST with JSON body and Content-Type header", async () => {
      const response = new Response(null, {
        status: 201,
        headers: { "x-restli-id": "urn:li:share:123" },
      });
      fetchSpy.mockResolvedValueOnce(response);

      const client = new LinkedInClient(CLIENT_OPTIONS);
      await client.create("/rest/posts", { commentary: "Hello" });

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.method).toBe("POST");
      expect(init.headers.get("Content-Type")).toBe("application/json");
      expect(init.body).toBe(JSON.stringify({ commentary: "Hello" }));
    });

    it("returns the x-restli-id header value", async () => {
      const response = new Response(null, {
        status: 201,
        headers: { "x-restli-id": "urn:li:share:456" },
      });
      fetchSpy.mockResolvedValueOnce(response);

      const client = new LinkedInClient(CLIENT_OPTIONS);
      const id = await client.create("/rest/posts", { commentary: "Test" });

      expect(id).toBe("urn:li:share:456");
    });

    it("throws LinkedInApiError when x-restli-id header is missing", async () => {
      const response = new Response(null, { status: 201 });
      fetchSpy.mockResolvedValueOnce(response);

      const client = new LinkedInClient(CLIENT_OPTIONS);

      try {
        await client.create("/rest/posts", {});
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(LinkedInApiError);
        expect((error as LinkedInApiError).message).toMatch(/No resource ID/);
      }
    });

    it("retries on 429 then returns ID on success", async () => {
      const rateLimited = jsonResponse({}, 429);
      const created = new Response(null, {
        status: 201,
        headers: { "x-restli-id": "urn:li:share:789" },
      });
      fetchSpy.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(created);

      const client = new LinkedInClient(CLIENT_OPTIONS);
      stubSleep(client);

      const id = await client.create("/rest/posts", { commentary: "Retry" });

      expect(id).toBe("urn:li:share:789");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("throws on 401 error", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, 401));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(client.create("/rest/posts", {})).rejects.toThrow(LinkedInAuthError);
    });
  });

  describe("upload", () => {
    it("sends PUT with binary body and content type to absolute URL", async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse(201));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      await client.upload("https://www.linkedin.com/dms-uploads/abc", data, "image/jpeg");

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://www.linkedin.com/dms-uploads/abc");
      expect(init.method).toBe("PUT");
      expect(init.body).toBe(data);
      expect(init.headers.get("Content-Type")).toBe("image/jpeg");
    });

    it("sends LinkedIn auth headers on upload", async () => {
      fetchSpy.mockResolvedValueOnce(emptyResponse(201));

      const client = new LinkedInClient(CLIENT_OPTIONS);
      await client.upload("https://www.linkedin.com/dms-uploads/abc", new Uint8Array(), "image/png");

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("throws on upload failure", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ message: "Upload failed" }, 400));

      const client = new LinkedInClient(CLIENT_OPTIONS);

      await expect(
        client.upload("https://www.linkedin.com/dms-uploads/abc", new Uint8Array(), "image/jpeg"),
      ).rejects.toThrow(LinkedInApiError);
    });
  });
});
