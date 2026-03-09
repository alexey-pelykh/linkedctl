// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import {
  LinkedInApiError,
  LinkedInAuthError,
  LinkedInRateLimitError,
  LinkedInServerError,
  LinkedInUpgradeRequiredError,
} from "./errors.js";

const RESTLI_PROTOCOL_VERSION = "2.0.0";
const DEFAULT_BASE_URL = "https://api.linkedin.com";
const DEFAULT_MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

export interface LinkedInClientOptions {
  /** OAuth2 access token. */
  accessToken: string;
  /** LinkedIn API version identifier (e.g. "202601"). */
  apiVersion: string;
  /** Base URL for the LinkedIn API. */
  baseUrl?: string | undefined;
  /** Value sent in the User-Agent header. */
  userAgent?: string | undefined;
  /** Maximum number of retry attempts on HTTP 429. Defaults to 3. */
  maxRetries?: number | undefined;
}

export class LinkedInClient {
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly maxRetries: number;

  constructor(options: LinkedInClientOptions) {
    this.accessToken = options.accessToken;
    this.apiVersion = options.apiVersion;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.userAgent = options.userAgent ?? "linkedctl";
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Send an HTTP request to the LinkedIn API.
   *
   * Automatically sets required LinkedIn headers, retries on 429 with
   * exponential backoff, and throws typed errors for known failure modes.
   */
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.sendRequest(path, init);
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  /**
   * Create a resource via POST and return the ID from the `x-restli-id`
   * response header (standard LinkedIn REST.li create pattern).
   */
  async create(path: string, body: unknown): Promise<string> {
    const response = await this.sendRequest(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const id = response.headers.get("x-restli-id");
    if (id === null) {
      throw new LinkedInApiError("No resource ID in response", response.status);
    }
    return id;
  }

  /**
   * Execute an HTTP request with retry logic and error handling.
   * Returns the raw successful Response.
   */
  private async sendRequest(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders(init?.headers);

    let lastError: LinkedInRateLimitError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs = this.calculateBackoff(attempt);
        await this.sleep(delayMs);
      }

      const response = await fetch(url, { ...init, headers });

      if (response.ok) {
        return response;
      }

      const body = await this.tryReadBody(response);

      if (response.status === 429) {
        lastError = new LinkedInRateLimitError("LinkedIn API rate limit exceeded", attempt + 1, body);
        if (attempt < this.maxRetries) {
          continue;
        }
        throw lastError;
      }

      if (response.status === 426) {
        throw new LinkedInUpgradeRequiredError(this.apiVersion, body);
      }

      if (response.status === 401) {
        throw new LinkedInAuthError("LinkedIn API authentication failed — please re-authenticate", body);
      }

      if (response.status >= 500) {
        throw new LinkedInServerError(`LinkedIn API server error (HTTP ${response.status})`, response.status, body);
      }

      throw new LinkedInApiError(`LinkedIn API request failed (HTTP ${response.status})`, response.status, body);
    }

    // This is only reachable if maxRetries < 0, but satisfies the compiler.
    throw lastError ?? new LinkedInApiError("Request failed", 0);
  }

  private buildHeaders(existing?: RequestInit["headers"]): Headers {
    const headers = new Headers(existing);
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    headers.set("LinkedIn-Version", this.apiVersion);
    headers.set("X-Restli-Protocol-Version", RESTLI_PROTOCOL_VERSION);
    headers.set("User-Agent", this.userAgent);
    return headers;
  }

  /** Exponential backoff: base * 2^(attempt-1) capped at BACKOFF_MAX_MS, with jitter. */
  private calculateBackoff(attempt: number): number {
    const exponential = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
    const capped = Math.min(exponential, BACKOFF_MAX_MS);
    const jitter = Math.random() * capped * 0.1;
    return capped + jitter;
  }

  private async tryReadBody(response: Response): Promise<unknown> {
    try {
      const text = await response.text();
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    } catch {
      return undefined;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
