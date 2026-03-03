// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { formatTable } from "./table-formatter.js";

describe("formatTable", () => {
  describe("array of objects", () => {
    it("formats a table with headers and rows", () => {
      const data = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];
      const result = formatTable(data);
      const lines = result.split("\n");
      expect(lines).toHaveLength(4); // header, separator, 2 rows
      expect(lines[0]).toMatch(/name\s+age/);
      expect(lines[1]).toMatch(/\u2500+/); // separator line
      expect(lines[2]).toMatch(/Alice\s+30/);
      expect(lines[3]).toMatch(/Bob\s+25/);
    });

    it("returns empty string for an empty array", () => {
      expect(formatTable([])).toBe("");
    });

    it("derives columns from all rows (union of keys)", () => {
      const data = [{ a: 1 }, { b: 2 }, { a: 3, b: 4 }];
      const result = formatTable(data);
      const header = result.split("\n")[0];
      expect(header).toMatch(/a/);
      expect(header).toMatch(/b/);
    });

    it("handles missing values with empty cells", () => {
      const data = [{ a: 1, b: 2 }, { a: 3 }];
      const result = formatTable(data);
      const lines = result.split("\n");
      // Second data row should have empty value for 'b'
      expect(lines[3]).toMatch(/3/);
    });

    it("wraps non-object array elements in { value: ... }", () => {
      const data = ["hello", "world"];
      const result = formatTable(data);
      expect(result).toContain("value");
      expect(result).toContain("hello");
      expect(result).toContain("world");
    });
  });

  describe("single object", () => {
    it("formats as key-value pairs", () => {
      const data = { name: "Alice", email: "alice@example.com" };
      const result = formatTable(data);
      const lines = result.split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/name\s+Alice/);
      expect(lines[1]).toMatch(/email\s+alice@example\.com/);
    });

    it("returns empty string for an empty object", () => {
      expect(formatTable({})).toBe("");
    });

    it("aligns keys to the widest key", () => {
      const data = { a: "1", longkey: "2" };
      const result = formatTable(data);
      const lines = result.split("\n");
      // "a" should be padded to match "longkey" width
      expect(lines[0]).toMatch(/^a\s{6,}\s+1$/);
    });
  });

  describe("primitive values", () => {
    it("stringifies a string", () => {
      expect(formatTable("hello")).toBe("hello");
    });

    it("stringifies a number", () => {
      expect(formatTable(42)).toBe("42");
    });

    it("stringifies null", () => {
      expect(formatTable(null)).toBe("null");
    });

    it("stringifies undefined", () => {
      expect(formatTable(undefined)).toBe("undefined");
    });

    it("stringifies a boolean", () => {
      expect(formatTable(true)).toBe("true");
    });
  });
});
