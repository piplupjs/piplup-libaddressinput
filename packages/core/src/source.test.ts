import { describe, expect, it, vi } from "vitest";
import { HybridSource, FallbackAggregateSource, type Source } from "./source.js";

describe("HybridSource", () => {
  it("returns primary source result if successful", async () => {
    const mockPrimary: Source = {
      get: vi.fn().mockResolvedValue({ success: true, data: '{"id":"data/US"}' }),
    };
    const mockFallback: Source = {
      get: vi.fn(),
    };

    const source = new HybridSource(mockPrimary, mockFallback);
    const result = await source.get("data/US");

    expect(result.success).toBe(true);
    expect(result.data).toBe('{"id":"data/US"}');
    expect(mockPrimary.get).toHaveBeenCalledWith("data/US");
    expect(mockFallback.get).not.toHaveBeenCalled();
  });

  it("falls back to secondary source when primary returns success: false", async () => {
    const mockPrimary: Source = {
      get: vi.fn().mockResolvedValue({ success: false, data: undefined }),
    };
    const mockFallback: Source = {
      get: vi.fn().mockResolvedValue({ success: true, data: '{"id":"data/US/CA"}' }),
    };

    const source = new HybridSource(mockPrimary, mockFallback);
    const result = await source.get("data/US/CA");

    expect(result.success).toBe(true);
    expect(result.data).toBe('{"id":"data/US/CA"}');
    expect(mockFallback.get).toHaveBeenCalledWith("data/US/CA");
  });

  it("falls back to secondary source when primary throws a network error", async () => {
    const mockPrimary: Source = {
      get: vi.fn().mockRejectedValue(new Error("Network offline")),
    };
    const mockFallback: Source = {
      get: vi.fn().mockResolvedValue({ success: true, data: '{"id":"data/US"}' }),
    };

    const source = new HybridSource(mockPrimary, mockFallback);
    const result = await source.get("data/US");

    expect(result.success).toBe(true);
    expect(result.data).toBe('{"id":"data/US"}');
  });

  it("works with real FallbackAggregateSource as fallback", async () => {
    const mockPrimary: Source = {
      get: vi.fn().mockResolvedValue({ success: false, data: undefined }),
    };
    const source = new HybridSource(mockPrimary, new FallbackAggregateSource());
    const result = await source.get("data/US");

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data).toContain("data/US");
  });
});
