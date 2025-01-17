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
    expect(result.stdout).toContain("Usage: modeldb [options] [search terms]");
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
});
