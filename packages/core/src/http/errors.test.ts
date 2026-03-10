// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import {
  LinkedInApiError,
  LinkedInAuthError,
  LinkedInForbiddenError,
  LinkedInRateLimitError,
  LinkedInServerError,
  LinkedInUpgradeRequiredError,
} from "./errors.js";

describe("LinkedInApiError", () => {
  it("stores status and message", () => {
    const error = new LinkedInApiError("bad request", 400);
    expect(error.message).toBe("bad request");
    expect(error.status).toBe(400);
    expect(error.name).toBe("LinkedInApiError");
    expect(error.responseBody).toBeUndefined();
  });

  it("stores response body when provided", () => {
    const body = { error: "invalid_request" };
    const error = new LinkedInApiError("bad request", 400, body);
    expect(error.responseBody).toEqual(body);
  });

  it("is an instance of Error", () => {
    const error = new LinkedInApiError("test", 400);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("LinkedInAuthError", () => {
  it("has status 401 and correct name", () => {
    const error = new LinkedInAuthError("unauthorized");
    expect(error.status).toBe(401);
    expect(error.name).toBe("LinkedInAuthError");
    expect(error.message).toBe("unauthorized");
  });

  it("is an instance of LinkedInApiError", () => {
    const error = new LinkedInAuthError("unauthorized");
    expect(error).toBeInstanceOf(LinkedInApiError);
  });

  it("stores response body", () => {
    const body = { message: "Token expired" };
    const error = new LinkedInAuthError("unauthorized", body);
    expect(error.responseBody).toEqual(body);
  });
});

describe("LinkedInForbiddenError", () => {
  it("has status 403 and correct name", () => {
    const error = new LinkedInForbiddenError("forbidden");
    expect(error.status).toBe(403);
    expect(error.name).toBe("LinkedInForbiddenError");
    expect(error.message).toBe("forbidden");
  });

  it("is an instance of LinkedInApiError", () => {
    const error = new LinkedInForbiddenError("forbidden");
    expect(error).toBeInstanceOf(LinkedInApiError);
  });

  it("stores response body", () => {
    const body = { message: "Insufficient permissions" };
    const error = new LinkedInForbiddenError("forbidden", body);
    expect(error.responseBody).toEqual(body);
  });
});

describe("LinkedInRateLimitError", () => {
  it("has status 429, correct name, and retries count", () => {
    const error = new LinkedInRateLimitError("rate limited", 3);
    expect(error.status).toBe(429);
    expect(error.name).toBe("LinkedInRateLimitError");
    expect(error.retriesExhausted).toBe(3);
  });

  it("is an instance of LinkedInApiError", () => {
    const error = new LinkedInRateLimitError("rate limited", 3);
    expect(error).toBeInstanceOf(LinkedInApiError);
  });

  it("stores response body", () => {
    const body = { message: "Too many requests" };
    const error = new LinkedInRateLimitError("rate limited", 3, body);
    expect(error.responseBody).toEqual(body);
  });
});

describe("LinkedInUpgradeRequiredError", () => {
  it("has status 426 and correct name", () => {
    const error = new LinkedInUpgradeRequiredError("202601");
    expect(error.status).toBe(426);
    expect(error.name).toBe("LinkedInUpgradeRequiredError");
  });

  it("includes api version in message", () => {
    const error = new LinkedInUpgradeRequiredError("202601");
    expect(error.message).toContain("202601");
    expect(error.message).toContain("no longer supported");
  });

  it("is an instance of LinkedInApiError", () => {
    const error = new LinkedInUpgradeRequiredError("202601");
    expect(error).toBeInstanceOf(LinkedInApiError);
  });

  it("stores response body", () => {
    const body = { message: "Upgrade Required" };
    const error = new LinkedInUpgradeRequiredError("202601", body);
    expect(error.responseBody).toEqual(body);
  });
});

describe("LinkedInServerError", () => {
  it("has the given 5xx status and correct name", () => {
    const error = new LinkedInServerError("server error", 502);
    expect(error.status).toBe(502);
    expect(error.name).toBe("LinkedInServerError");
    expect(error.message).toBe("server error");
  });

  it("is an instance of LinkedInApiError", () => {
    const error = new LinkedInServerError("server error", 500);
    expect(error).toBeInstanceOf(LinkedInApiError);
  });

  it("stores response body", () => {
    const body = { error: "internal" };
    const error = new LinkedInServerError("server error", 500, body);
    expect(error.responseBody).toEqual(body);
  });
});
