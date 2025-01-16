import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import consola from "consola";

// Mock types
type CliModule = {
  run: () => Promise<void>;
};

// Hoisted module mocks
vi.mock("consola");

vi.mock("../src/cli", () => ({
  run: vi.fn(async () => {}),
}));

vi.mock("../src/commands/default", () => ({
  run: vi.fn(async () => {}),
}));

describe("CLI integration", () => {
  let mockExit: MockInstance;
  let cli: CliModule;

  beforeEach(async () => {
    mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    cli = await import("../src/cli");

    // Reset consola mocks before each test
    vi.mocked(consola).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call default subcommand if no args are given", async () => {
    const argvBackup = process.argv;
    process.argv = ["node", "cli.js"]; // simulate `npx aidex` with no arguments

    await cli.run();

    expect(mockExit).not.toHaveBeenCalled();
    process.argv = argvBackup;
  });

  it("should show unknown command error for random subcommand", async () => {
    const argvBackup = process.argv;
    process.argv = ["node", "cli.js", "random-cmd"];

    await cli.run();

    expect(consola.error).toHaveBeenCalledWith("Unknown command random-cmd");
    expect(mockExit).toHaveBeenCalledWith(1);

    process.argv = argvBackup;
  });
});
