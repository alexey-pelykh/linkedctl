// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { OutputFormat } from "./format.js";
import { formatJson } from "./json-formatter.js";
import { formatTable } from "./table-formatter.js";

/**
 * Format data according to the specified output format.
 */
export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case "json":
      return formatJson(data);
    case "table":
      return formatTable(data);
  }
}
