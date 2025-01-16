import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import type { Argv } from "mri";
import defaultCommand from "../../src/commands/default";

// Hoisted module mocks (moved to top level)
vi.mock("../../src/model-db", () => ({
  loadModelDb: async () => ({
    "gpt-4": { price: 0.03, source: "some-source" },
    "claude-v1": { price: 0.025 },
  }),
}));

vi.mock("consola", () => ({
  default: {
    error: vi.fn(),
    box: vi.fn(),
    info: vi.fn(),
  },
}));

describe("default command integration", () => {
  let mockExit: MockInstance;
  let consola: any;

  beforeEach(async () => {
    mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    consola = await import("consola");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should show usage info and exit if no modelQuery is provided", async () => {
    const argv = { _: [] } as Argv;

    await defaultCommand(argv);

    expect(consola.default.error).toHaveBeenCalledWith(
      expect.stringContaining("Usage:")
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should show error and exit if no matching models found", async () => {
    const argv = { _: ["", "non-existent-model"] } as unknown as Argv;

    await defaultCommand(argv);

    expect(consola.default.error).toHaveBeenCalledWith(
      'No models found matching "non-existent-model"'
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should show detailed info if the model name is an exact match", async () => {
    const argv = { _: ["", "gpt-4"] } as unknown as Argv;

    await defaultCommand(argv);

    expect(consola.default.box).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "gpt-4",
        message: expect.stringContaining("Price: 0.03"),
      })
    );
    expect(consola.default.info).toHaveBeenCalledWith("\nSource: some-source");
  });

  it("should show a list of matching models when partial match or filter is found", async () => {
    const argv = { _: ["", "gpt"] } as unknown as Argv;

    await defaultCommand(argv);

    expect(consola.default.box).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Models matching "gpt"'),
        message: expect.stringContaining("- gpt-4"),
      })
    );
  });
});
