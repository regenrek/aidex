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

  it("sorts models by token count", () => {
    const result = spawnSync("node", [cliPath, "--sort-token"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    // Extract max tokens column and verify descending order
    const lines = result.stdout.split("\n");
    const tokenValues = lines
      .slice(1) // Skip header
      .map((line) => {
        const match = line.match(/\|\s*(\d+,?\d*)\s*\|/);
        return match ? Number.parseInt(match[1].replace(/,/g, "")) : 0;
      })
      .filter((val) => val > 0);

    expect(tokenValues).toEqual([...tokenValues].sort((a, b) => b - a));
  });

  it("sorts models by cost", () => {
    const result = spawnSync("node", [cliPath, "--sort-cost"], {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.stderr).toBe("");
    // Extract cost column and verify descending order
    const lines = result.stdout.split("\n");
    const costValues = lines
      .slice(1) // Skip header
      .map((line) => {
        const match = line.match(/\|\s*(\d+\.\d+e[-+]?\d+)\s*\|/);
        return match ? Number.parseFloat(match[1]) : 0;
      })
      .filter((val) => val > 0);

    expect(costValues).toEqual([...costValues].sort((a, b) => b - a));
  });

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
      "--group-by can only be used with --model flag"
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
});
