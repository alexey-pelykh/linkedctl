// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Format data as a pretty-printed JSON string.
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
