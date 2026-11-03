import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_METADATA } from "../../src/config/constants.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
) as { name: string; version: string };

describe("APP_METADATA", () => {
  it("should use the name and version from package.json", () => {
    expect(APP_METADATA).toEqual({ name: packageJson.name, version: packageJson.version });
  });
});
