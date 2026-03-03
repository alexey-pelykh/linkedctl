// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { formatOutput } from "./formatter.js";

describe("formatOutput", () => {
  const data = { name: "Alice", age: 30 };

  it("delegates to JSON formatter when format is 'json'", () => {
    const result = formatOutput(data, "json");
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("delegates to table formatter when format is 'table'", () => {
    const result = formatOutput(data, "table");
    expect(result).toContain("name");
    expect(result).toContain("Alice");
    expect(result).toContain("age");
    expect(result).toContain("30");
  });

  it("returns JSON array for format 'json' with array data", () => {
    const arr = [{ id: 1 }, { id: 2 }];
    const result = formatOutput(arr, "json");
    expect(result).toBe(JSON.stringify(arr, null, 2));
  });

  it("returns table for format 'table' with array data", () => {
    const arr = [
      { id: 1, value: "a" },
      { id: 2, value: "b" },
    ];
    const result = formatOutput(arr, "table");
    expect(result).toContain("id");
    expect(result).toContain("value");
  });
});
