import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { loadModelDb } from "../../src/model-db";

describe("loadModelDb", () => {
  beforeEach(() => {
    // Stub the global fetch
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    // Restore original globals
    vi.unstubAllGlobals();
  });

  it("should return an empty object if fetch fails", async () => {
    (fetch as Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("Network error"))
    );

    const result = await loadModelDb();
    expect(result).toEqual({});
  });

  it("should return an empty object if response is not ok", async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const result = await loadModelDb();
    expect(result).toEqual({});
  });

  it("should return an empty object if JSON parsing fails", async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("JSON parse error");
      },
    });

    const result = await loadModelDb();
    expect(result).toEqual({});
  });

  it("should return data if fetch is successful and JSON parsing is valid", async () => {
    const mockData = { modelA: { price: 0.01 }, modelB: { price: 0.02 } };
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await loadModelDb();
    expect(result).toEqual(mockData);
  });
});
