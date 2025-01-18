import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "pathe";

const cliPath = resolve(__dirname, "../dist/cli.mjs");

describe("Integration: CLI Commands", () => {
  it("shows help message with --help flag", () => {
    const result = spawnSync("node", [cliPath, "--help"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: aidex [options] [search terms]");
    expect(result.stdout).toContain("--function-calling");
    expect(result.stdout).toContain("--vision");
  });

  it("filters models by provider", () => {
    const result = spawnSync("node", [cliPath, "--provider", "anthropic"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("claude");
    expect(result.stdout).not.toContain("gpt-4");
  });

  it("filters models with function calling support", () => {
    const result = spawnSync("node", [cliPath, "--function-calling"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("gpt-4");
    // Add more specific model checks that support function calling
  });

  it("filters models with vision support", () => {
    const result = spawnSync("node", [cliPath, "--vision"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("gpt-4-vision");
    // Add more specific model checks that support vision
  });

  it("filters models by mode", () => {
    const result = spawnSync("node", [cliPath, "--mode", "chat"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("chat");
    expect(result.stdout).not.toContain("embedding");
  });

  it("sorts models by token count by default", () => {
    const result = spawnSync("node", [cliPath], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    const lines = result.stdout.split("\n");
    const tokenValues = extractTokenValues(lines);
    expect(tokenValues).toEqual([...tokenValues].sort((a, b) => b - a));
  });

  it("sorts models by token count with --sort-token flag", () => {
    const result = spawnSync("node", [cliPath, "--sort-token"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    const lines = result.stdout.split("\n");
    const tokenValues = extractTokenValues(lines);
    expect(tokenValues).toEqual([...tokenValues].sort((a, b) => b - a));
  });

  it("sorts models by cost with --sort-cost flag", () => {
    const result = spawnSync("node", [cliPath, "--sort-cost"], {
      encoding: "utf8",
      stdio: "pipe",
    });

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
      .filter((line) => line.includes("|")) // Only process table rows
      .map((line) => {
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
      .filter((line) => line.includes("|")) // Only process table rows
      .map((line) => {
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
    const result = spawnSync(
      "node",
      [cliPath, "--provider", "openai", "--function-calling", "--mode", "chat"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("gpt-4");
    expect(result.stdout).not.toContain("claude");
    expect(result.stdout).not.toContain("embedding");
  });

  it("handles invalid model search gracefully", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--model", "nonexistent-model"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toContain("No models found");
    expect(result.status).toBe(1);
  });

  it("supports multiple model search terms", () => {
    const result = spawnSync("node", [cliPath, "-m", "gpt-4", "-m", "claude"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("gpt-4");
    expect(result.stdout).toContain("claude");
  });

  // // this makes no sense
  // it("groups models by provider with --model flag", () => {
  //   const result = spawnSync(
  //     "node",
  //     [cliPath, "--model", "gpt", "--group-by", "provider"],
  //     {
  //       encoding: "utf8",
  //       stdio: "pipe",
  //     }
  //   );

  //   expect(result.stderr).toBe("");
  //   expect(result.stdout).toContain("openai Models:");
  //   expect(result.stdout).toContain("anthropic Models:");
  // });

  it("groups models by type with --model flag", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--model", "gpt", "--group-by", "type"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("latest Models:");
    expect(result.stdout).toContain("audio Models:");
  });

  it("rejects --group-by without --model flag", () => {
    const result = spawnSync("node", [cliPath, "--group-by", "provider"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toContain(
      "--group-by can only be used with --model or --provider flag"
    );
    expect(result.status).toBe(1);
  });

  it("shows all model versions with --show-all flag", () => {
    const result = spawnSync("node", [cliPath, "--show-all"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    // Should include older model versions
    expect(result.stdout).toContain("gpt-4-0314");
  });

  it("compares specific models", () => {
    const result = spawnSync("node", [cliPath, "--compare", "gpt-4,deepseek"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    console.log(result.stdout);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Model Comparison:");
    expect(result.stdout).toContain("gpt-4");
    expect(result.stdout).toContain("deepseek");
  });

  // it("shows debug output with verbose flag", () => {
  //   const result = spawnSync("node", [cliPath, "--verbose", "2"], {
  //     encoding: "utf8",
  //     stdio: "pipe",
  //   });

  //   expect(result.stderr).toBe("");
  //   expect(result.stdout).toContain("Search Debug:");
  //   expect(result.stdout).toContain("Documents prepared:");
  // });

  // it("groups models by series with --model flag", () => {
  //   const result = spawnSync(
  //     "node",
  //     [cliPath, "--model", "gpt", "--group-by", "series"],
  //     {
  //       encoding: "utf8",
  //       stdio: "pipe",
  //     }
  //   );

  //   expect(result.stderr).toBe("");
  //   expect(result.stdout).toContain("gpt-4o Models:");

  //   // Legacy models should not appear without --show-all
  //   expect(result.stdout).not.toContain("legacy Models:");
  //   expect(result.stdout).not.toContain("claude-2");
  //   expect(result.stdout).not.toContain("gpt-4-turbo");
  // });

  it("shows specialized model series with --model flag", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--model", "gpt", "--group-by", "series"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("realtime Models:");
  });

  it("shows legacy models with --show-all and series grouping", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--model", "gpt", "--group-by", "series", "--show-all"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("legacy Models:");
    // Check for various legacy models defined in rules
    expect(result.stdout).toContain("gpt-4-32k-0613");
    expect(result.stdout).not.toContain("claude-2");
    expect(result.stdout).toMatch(/gpt-4-turbo/);
    expect(result.stdout).toMatch(/gpt-3/);
  });

  it("correctly groups mini model variants with --model flag", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--model", "o1", "--group-by", "series"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("o1 Models:");
    expect(result.stdout).toContain("o1-mini Models:");
  });

  it("groups models by type with --provider flag", () => {
    const result = spawnSync(
      "node",
      [cliPath, "--provider", "openai", "--group-by", "type"],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("latest Models:");
    expect(result.stdout).toContain("audio Models:");
  });

  it("correctly sorts models by cost in ascending order", () => {
    const result = spawnSync(
      "node",
      [
        cliPath,
        "--compare",
        "deepseek/deepseek-chat,claude-3-haiku,claude-3-opus",
        "--sort-by",
        "input_cost_per_token",
      ],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");

    // Get the table content
    const tableLines = result.stdout
      .split("\n")
      .filter((line) => line.includes("│"))
      .filter((line) => !line.includes("─"));

    // Extract model names in order they appear in table
    const modelOrder = tableLines
      .slice(1) // Skip header
      .map((line) => line.split("│")[1].trim());

    // Verify order matches expected (deepseek should be first as it has lowest cost)
    expect(modelOrder[0]).toContain("deepseek");
    expect(modelOrder.at(-1)).toContain("opus");
  });

  it("preserves sort order when displaying grouped results", () => {
    const result = spawnSync(
      "node",
      [
        cliPath,
        "--provider",
        "anthropic,deepseek",
        "--sort-by",
        "input_cost_per_token",
        "--group-by",
        "provider",
      ],
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    expect(result.stderr).toBe("");

    // Within each provider group, models should be sorted by cost
    const lines = result.stdout.split("\n");
    const deepseekSection = lines
      .slice(lines.findIndex((l) => l.includes("deepseek Models:")) + 1)
      .filter((line) => line.includes("│"))
      .filter((line) => !line.includes("─"));

    const anthropicSection = lines
      .slice(lines.findIndex((l) => l.includes("anthropic Models:")) + 1)
      .filter((line) => line.includes("│"))
      .filter((line) => !line.includes("─"));

    // Helper to extract cost from a table row
    const getCostFromLine = (line: string): number => {
      const match = line.match(/\$(\d+\.?\d*)/);
      return match ? Number.parseFloat(match[1]) : Infinity;
    };

    // Verify costs are in ascending order within each section
    // eslint-disable-next-line unicorn/no-array-callback-reference
    const deepseekCosts = deepseekSection.slice(1).map(getCostFromLine);
    // eslint-disable-next-line unicorn/no-array-callback-reference
    const anthropicCosts = anthropicSection.slice(1).map(getCostFromLine);

    expect(deepseekCosts).toEqual([...deepseekCosts].sort((a, b) => a - b));
    expect(anthropicCosts).toEqual([...anthropicCosts].sort((a, b) => a - b));
  });
});
