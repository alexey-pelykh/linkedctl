// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { detectFormat, resolveFormat } from "./format.js";

describe("detectFormat", () => {
  it("returns 'table' when stream is a TTY", () => {
    expect(detectFormat({ isTTY: true })).toBe("table");
  });

  it("returns 'json' when stream is not a TTY", () => {
    expect(detectFormat({ isTTY: false })).toBe("json");
  });

  it("returns 'json' when isTTY is undefined", () => {
    expect(detectFormat({})).toBe("json");
  });

  it("returns 'json' when isTTY is missing", () => {
    expect(detectFormat({} as { isTTY?: boolean })).toBe("json");
  });
});

describe("resolveFormat", () => {
  it("returns explicit 'json' regardless of TTY", () => {
    expect(resolveFormat("json", { isTTY: true })).toBe("json");
  });

  it("returns explicit 'table' regardless of piped stream", () => {
    expect(resolveFormat("table", { isTTY: false })).toBe("table");
  });

  it("falls back to TTY detection when explicit is undefined", () => {
    expect(resolveFormat(undefined, { isTTY: true })).toBe("table");
    expect(resolveFormat(undefined, { isTTY: false })).toBe("json");
  });

  it("returns 'json' when globalJson is true and no explicit format", () => {
    expect(resolveFormat(undefined, { isTTY: true }, true)).toBe("json");
  });

  it("returns explicit format even when globalJson is true", () => {
    expect(resolveFormat("table", { isTTY: false }, true)).toBe("table");
  });

  it("falls back to TTY detection when globalJson is false", () => {
    expect(resolveFormat(undefined, { isTTY: true }, false)).toBe("table");
  });
});
