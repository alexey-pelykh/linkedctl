// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Base error for all LinkedIn API HTTP errors.
 */
export class LinkedInApiError extends Error {
  public readonly status: number;
  public readonly responseBody: unknown;

  constructor(message: string, status: number, responseBody?: unknown) {
    super(message);
    this.name = "LinkedInApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

/**
 * Thrown on HTTP 401 — the access token is invalid or expired.
 */
export class LinkedInAuthError extends LinkedInApiError {
  constructor(message: string, responseBody?: unknown) {
    super(message, 401, responseBody);
    this.name = "LinkedInAuthError";
  }
}

/**
 * Thrown on HTTP 429 when all retry attempts have been exhausted.
 */
export class LinkedInRateLimitError extends LinkedInApiError {
  public readonly retriesExhausted: number;

  constructor(message: string, retriesExhausted: number, responseBody?: unknown) {
    super(message, 429, responseBody);
    this.name = "LinkedInRateLimitError";
    this.retriesExhausted = retriesExhausted;
  }
}

/**
 * Thrown on HTTP 5xx — server-side failure.
 */
export class LinkedInServerError extends LinkedInApiError {
  constructor(message: string, status: number, responseBody?: unknown) {
    super(message, status, responseBody);
    this.name = "LinkedInServerError";
  }
}
