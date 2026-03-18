// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { escapeRestliReservedCharacters } from "./escape.js";

describe("escapeRestliReservedCharacters", () => {
  it("returns plain text unchanged", () => {
    expect(escapeRestliReservedCharacters("Hello LinkedIn")).toBe("Hello LinkedIn");
  });

  it("escapes parentheses", () => {
    expect(escapeRestliReservedCharacters("129 of them (18%) hit the error")).toBe(
      "129 of them \\(18%\\) hit the error",
    );
  });

  it("escapes square brackets", () => {
    expect(escapeRestliReservedCharacters("see [this] article")).toBe("see \\[this\\] article");
  });

  it("escapes curly braces", () => {
    expect(escapeRestliReservedCharacters("config: {key: val}")).toBe("config: \\{key: val\\}");
  });

  it("escapes angle brackets", () => {
    expect(escapeRestliReservedCharacters("use <html> tags")).toBe("use \\<html\\> tags");
  });

  it("escapes at sign", () => {
    expect(escapeRestliReservedCharacters("reach me @handle")).toBe("reach me \\@handle");
  });

  it("escapes hash", () => {
    expect(escapeRestliReservedCharacters("trending #topic")).toBe("trending \\#topic");
  });

  it("escapes asterisk", () => {
    expect(escapeRestliReservedCharacters("bold *text* here")).toBe("bold \\*text\\* here");
  });

  it("escapes tilde", () => {
    expect(escapeRestliReservedCharacters("approx ~100")).toBe("approx \\~100");
  });

  it("escapes underscore", () => {
    expect(escapeRestliReservedCharacters("snake_case")).toBe("snake\\_case");
  });

  it("escapes pipe", () => {
    expect(escapeRestliReservedCharacters("A | B")).toBe("A \\| B");
  });

  it("escapes backslash", () => {
    expect(escapeRestliReservedCharacters("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("escapes multiple reserved characters in one string", () => {
    expect(escapeRestliReservedCharacters('129 of them (18%) hit "API rate limit" error')).toBe(
      '129 of them \\(18%\\) hit "API rate limit" error',
    );
  });

  it("does not escape double quotes", () => {
    expect(escapeRestliReservedCharacters('"quoted"')).toBe('"quoted"');
  });

  it("does not escape single quotes", () => {
    expect(escapeRestliReservedCharacters("it's fine")).toBe("it's fine");
  });

  it("does not escape percent sign", () => {
    expect(escapeRestliReservedCharacters("100% done")).toBe("100% done");
  });

  it("does not escape dollar sign", () => {
    expect(escapeRestliReservedCharacters("$4/month")).toBe("$4/month");
  });

  it("preserves newlines", () => {
    expect(escapeRestliReservedCharacters("line1\n\nline2")).toBe("line1\n\nline2");
  });

  it("handles empty string", () => {
    expect(escapeRestliReservedCharacters("")).toBe("");
  });
});
