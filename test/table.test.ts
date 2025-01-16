import { describe, it, expect } from "vitest";
import tableize from "../src/table";

describe("tableize", () => {
  it("should handle ANSI color codes correctly", () => {
    const input = {
      headers: ["Col1", "Col2"],
      rows: [["\u001B[32mGreen\u001B[0m", "Normal"]],
    };
    const result = tableize(input);
    expect(result).toContain("Green");
    expect(result.split("\n").length).toBeGreaterThan(4);
  });

  it("should throw error on mismatched columns", () => {
    const input = {
      headers: ["Col1", "Col2"],
      rows: [["Single"]],
    };
    expect(() => tableize(input)).toThrow();
  });
});
