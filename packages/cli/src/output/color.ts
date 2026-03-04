// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Determine whether color output is enabled.
 *
 * Color is disabled when:
 * - The `NO_COLOR` environment variable is set (any value, per https://no-color.org/)
 * - The `noColor` flag is `true` (from `--no-color` CLI flag)
 *
 * @param options.noColor - Whether the `--no-color` CLI flag was provided
 * @param options.env - Environment variables to check (defaults to `process.env`)
 */
export function isColorEnabled(options?: {
  noColor?: boolean | undefined;
  env?: Record<string, string | undefined> | undefined;
}): boolean {
  const env = options?.env ?? process.env;

  if ("NO_COLOR" in env) {
    return false;
  }

  if (options?.noColor === true) {
    return false;
  }

  return true;
}
