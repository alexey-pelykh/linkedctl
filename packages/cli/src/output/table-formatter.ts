// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Format data as a human-readable table string.
 *
 * - Array of objects: columnar table with headers derived from object keys.
 * - Single object: two-column key/value table.
 * - Primitive: stringified value.
 */
export function formatTable(data: unknown): string {
  if (Array.isArray(data)) {
    return data.length === 0 ? "" : formatArrayTable(data);
  }
  if (typeof data === "object" && data !== null) {
    return formatRecordTable(data as Record<string, unknown>);
  }
  return String(data);
}

function formatArrayTable(rows: unknown[]): string {
  const records = rows.map(toRecord);
  const columns = deriveColumns(records);

  if (columns.length === 0) {
    return "";
  }

  const widths = computeColumnWidths(columns, records);
  const header = columns.map((col, i) => pad(col, widths[i] ?? 0)).join("  ");
  const separator = widths.map((w) => "\u2500".repeat(w)).join("  ");
  const body = records
    .map((row) => columns.map((col, i) => pad(cellValue(row[col]), widths[i] ?? 0)).join("  "))
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

function formatRecordTable(record: Record<string, unknown>): string {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return "";
  }

  const keyWidth = Math.max(...entries.map(([key]) => key.length));
  return entries.map(([key, value]) => `${pad(key, keyWidth)}  ${cellValue(value)}`).join("\n");
}

function deriveColumns(records: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

function computeColumnWidths(columns: string[], records: Record<string, unknown>[]): number[] {
  return columns.map((col) => {
    const headerLen = col.length;
    const maxValueLen = records.reduce((max, row) => Math.max(max, cellValue(row[col]).length), 0);
    return Math.max(headerLen, maxValueLen);
  });
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value as string | number | boolean | bigint | symbol);
}

function pad(value: string, width: number): string {
  return value.padEnd(width);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}
