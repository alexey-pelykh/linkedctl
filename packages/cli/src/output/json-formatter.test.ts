// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { formatJson } from "./json-formatter.js";

describe("formatJson", () => {
  it("pretty-prints an object with 2-space indent", () => {
    const data = { name: "Alice", age: 30 };
    expect(formatJson(data)).toBe(JSON.stringify(data, null, 2));
  });

  it("pretty-prints an array of objects", () => {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    expect(formatJson(data)).toBe(JSON.stringify(data, null, 2));
  });

  it("formats a primitive string", () => {
    expect(formatJson("hello")).toBe('"hello"');
  });

  it("formats a number", () => {
    expect(formatJson(42)).toBe("42");
  });

  it("formats null", () => {
    expect(formatJson(null)).toBe("null");
  });

  it("formats a boolean", () => {
    expect(formatJson(true)).toBe("true");
  });
});
