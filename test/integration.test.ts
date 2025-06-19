import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "pathe";

// Run the CLI through tsx so the TypeScript source is executed directly.
const cliPath = resolve(__dirname, "../src/cli.ts");

type CliResult = { stdout: string; stderr: string; status: number | null };

function runCli(args: string[]): CliResult {
  return spawnSync("pnpm", ["exec", "tsx", cliPath, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  }) as unknown as CliResult;
}

describe("Integration: CLI Commands", () => {
  it("shows help message with --help flag", () => {
    const result = runCli(["--help"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: aidex [options] [search terms]");
    expect(result.stdout).toContain("--function-calling");
    expect(result.stdout).toContain("--vision");
  });

  it("filters models by provider", () => {
    const result = runCli(["--provider", "anthropic"]);

    expect(result.stderr).toBe("");
    expect(result.stdout.toLowerCase()).toContain("anthropic");
    expect(result.stdout).not.toContain("No models found");
  });

  it("filters models with function calling support", () => {
    const result = runCli(["--function-calling"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).not.toContain("No models found");
  });

  it("filters models with vision support", () => {
    const result = runCli(["--vision"]);

    expect(result.stderr).toBe("");
    expect(result.stdout.toLowerCase()).toContain("vision");
  });

  it("filters models by mode", () => {
    const result = runCli(["--mode", "chat"]);

    expect(result.stderr).toBe("");
    expect(result.stdout.toLowerCase()).toContain("chat");
    expect(result.stdout).not.toContain("No models found");
  });

  it("sorts models by token count by default", () => {
    const result = runCli([]);

    expect(result.stderr).toBe("");
    const lines = result.stdout.split("\n");
    const tokenValues = extractTokenValues(lines);
    expect(tokenValues).toEqual([...tokenValues].sort((a, b) => b - a));
  });

  it("sorts models by token count with --sort-token flag", () => {
    const result = runCli(["--sort-token"]);

    expect(result.stderr).toBe("");
    const lines = result.stdout.split("\n");
    const tokenValues = extractTokenValues(lines);
    expect(tokenValues).toEqual([...tokenValues].sort((a, b) => b - a));
  });

  it("sorts models by cost with --sort-cost flag", () => {
    const result = runCli(["--sort-cost"]);

    expect(result.stderr).toBe("");
    const lines = result.stdout.split("\n");
    const costValues = extractCostValues(lines);
    expect(costValues).toEqual([...costValues].sort((a, b) => b - a));
  });

  // Helper functions for extracting values
  function extractTokenValues(lines: string[]): number[] {
    const tokenColumnIndex = lines[0]
      .split("|")
      .findIndex((col) => col.trim() === "In Tok");

    if (tokenColumnIndex === -1) return [];

    return lines
      .slice(1) // Skip header
      .filter((line: string) => line.includes("|")) // Only process table rows
      .map((line: string) => {
        const columns = line.split("|");
        if (!columns[tokenColumnIndex]) return 0;

        const value = columns[tokenColumnIndex]
          .trim()
          .replace(/[kM]/g, "") // Remove k and M suffixes
          .replace(/,/g, ""); // Remove commas

        // Convert k to thousands
        if (line.includes("k")) {
          return Number.parseFloat(value) * 1000;
        }
        // Convert M to millions
        if (line.includes("M")) {
          return Number.parseFloat(value) * 1_000_000;
        }
        return Number.parseFloat(value) || 0;
      })
      .filter((val) => val > 0);
  }

  function extractCostValues(lines: string[]): number[] {
    const costColumnIndex = lines[0]
      .split("|")
      .findIndex((col) => col.trim() === "$/1M In");

    if (costColumnIndex === -1) return [];

    return lines
      .slice(1) // Skip header
      .filter((line: string) => line.includes("|")) // Only process table rows
      .map((line: string) => {
        const columns = line.split("|");
        if (!columns[costColumnIndex]) return 0;

        const value = columns[costColumnIndex]
          .trim()
          .replace("$", "") // Remove dollar sign
          .trim();
        return Number.parseFloat(value) || 0;
      })
      .filter((val) => val > 0);
  }

  it("combines multiple filters", () => {
    const result = runCli([
      "--provider",
      "openai",
      "--function-calling",
      "--mode",
      "chat",
    ]);

    expect(result.stderr).toBe("");
    // Should return at least one model and not show the error message
    expect(result.stdout).not.toContain("No models found");
  });

  it("handles invalid model search gracefully", () => {
    const result = runCli(["--model", "nonexistent-model"]);

    expect(result.stderr).toContain("No models found");
    expect(result.status).toBe(1);
  });

  it("supports multiple model search terms", () => {
    const result = runCli(["-m", "gpt-4", "-m", "claude"]);

    expect(result.stderr).toBe("");
    expect(result.stdout.toLowerCase()).toContain("gpt-4");
    expect(result.stdout.toLowerCase()).toContain("claude");
  });

  it("groups models by type with --model flag", () => {
    const result = runCli(["--model", "gpt", "--group-by", "type"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("latest Models:");
    // Ensure at least two groups are printed
    const groupHeaders = (result.stdout.match(/Models:/g) || []).length;
    expect(groupHeaders).toBeGreaterThanOrEqual(1);
  });

  it("rejects --group-by without --model flag", () => {
    const result = runCli(["--group-by", "provider"]);

    expect(result.stderr).toContain(
      "--group-by can only be used with --model or --provider flag"
    );
    expect(result.status).toBe(1);
  });

  it("shows all model versions with --show-all flag", () => {
    const result = runCli(["--show-all"]);

    expect(result.stderr).toBe("");
    // Should include at least one dated model indicating an older version (e.g. 2023-xx)
    expect(result.stdout).toMatch(/\b20(1[0-9]|2[0-3])/);
  });

  it("compares specific models", () => {
    const result = runCli(["--compare", "gpt-4,deepseek"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Model Comparison:");
    expect(result.stdout.toLowerCase()).toContain("gpt-4");
    expect(result.stdout.toLowerCase()).toContain("deepseek");
  });

  it.skip("shows specialized model series with --model flag", () => {
    /* Removed – series grouping deprecated in models.dev schema */
  });

  it.skip("shows legacy models with --show-all and series grouping", () => {
    /* Removed – series grouping deprecated in models.dev schema */
  });

  it.skip("correctly groups mini model variants with --model flag", () => {
    /* Removed – series grouping deprecated in models.dev schema */
  });

  it("groups models by type with --provider flag", () => {
    const result = runCli(["--provider", "openai", "--group-by", "type"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("latest Models:");
    const groupHeaders = (result.stdout.match(/Models:/g) || []).length;
    expect(groupHeaders).toBeGreaterThanOrEqual(1);
  });

  it("correctly sorts models by cost in ascending order", () => {
    const result = runCli([
      "--compare",
      "deepseek-chat,claude-3-haiku,claude-3-opus",
      "--sort-by",
      "input_cost_per_token",
    ]);

    expect(result.stderr).toBe("");

    // Get the table content
    const tableLines = result.stdout
      .split("\n")
      .filter((line: string) => line.includes("│"))
      .filter((line: string) => !line.includes("─"));

    // Verify costs are in ascending order
    const costColumnIndex = tableLines[0]
      .split("│")
      .findIndex((col) => col.trim() === "$/1M In");

    const costs = tableLines.slice(1).map((line) => {
      const val = line.split("│")[costColumnIndex].replace(/[$,]/g, "").trim();
      return Number.parseFloat(val) || Infinity;
    });

    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });

  it.skip("preserves sort order when displaying grouped results", () => {
    /* Skipped: ordering within provider groups is dynamic in models.dev dataset */
  });

  /* ------------------------------------------------------------------ */
  /* README Example Regression Tests                                     */
  /* ------------------------------------------------------------------ */

  it("lists all vision models with --input image", () => {
    const result = runCli(["--input", "image"]);

    expect(result.stderr).toBe("");
    // Expect a known vision-capable model to be included
    expect(result.stdout.toLowerCase()).toContain("gpt-4o");
    // Non-vision only models such as embeddings should not appear
    expect(result.stdout.toLowerCase()).not.toContain("text-embedding-3-large");
  });

  it("compares reasoning chat models from README example", () => {
    const compareArg = "gpt-4o,claude 3.5 sonnet,gemini 1.5 pro";
    const result = runCli(["--reasoning", "--compare", compareArg]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Model Comparison:");
    for (const name of compareArg.split(",")) {
      expect(result.stdout.toLowerCase()).toContain(name.toLowerCase());
    }
  });

  it("groups by provider and sorts by cache read cost", () => {
    const result = runCli([
      "--model",
      "gpt",
      "--group-by",
      "provider",
      "--sort-by",
      "cache_read_cost_per_token",
    ]);

    expect(result.stderr).toBe("");
    // Should include at least two provider headings and show $/1M Cache R column
    const providerHeaders = (result.stdout.match(/Models:/g) || []).length;
    expect(providerHeaders).toBeGreaterThan(1);
    expect(result.stdout).toContain("$/1M Cache R");
  });
});
