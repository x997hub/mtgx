/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { useInfiniteScroll } from "../useInfiniteScroll";

describe("useInfiniteScroll", () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let intersectionCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockUnobserve = vi.fn();

    // Override the global mock from setup.ts with a proper constructor function
    // Arrow functions cannot be used with `new`, so we use a function expression
    const MockIO = vi.fn(function (
      this: any,
      callback: (entries: Partial<IntersectionObserverEntry>[]) => void
    ) {
      intersectionCallback = callback;
      this.observe = mockObserve;
      this.disconnect = mockDisconnect;
      this.unobserve = mockUnobserve;
    });
    window.IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a callback ref function", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    expect(typeof result.current).toBe("function");
  });

  it("creates IntersectionObserver and observes node when ref is called", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    expect(window.IntersectionObserver).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalledWith(node);
  });

  it("does NOT create observer when node is null", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    act(() => {
      result.current(null);
    });

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("does NOT create observer when hasNextPage is false", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, false, false)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("calls fetchNextPage when intersection is detected and hasNextPage is true", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    // Simulate intersection
    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does NOT call fetchNextPage when not intersecting", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    act(() => {
      intersectionCallback([{ isIntersecting: false }]);
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("does NOT call fetchNextPage when isFetchingNextPage is true", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, true)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("disconnects previous observer when ref is called again", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    const node1 = document.createElement("div");
    act(() => {
      result.current(node1);
    });

    const firstDisconnect = mockDisconnect;

    const node2 = document.createElement("div");
    act(() => {
      result.current(node2);
    });

    // The first observer should have been disconnected
    expect(firstDisconnect).toHaveBeenCalled();
  });

  it("disconnects observer on unmount (cleanup effect)", () => {
    const fetchNextPage = vi.fn();
    const { result, unmount } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("disconnects when ref is called with null", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll(fetchNextPage, true, false)
    );

    const node = document.createElement("div");
    act(() => {
      result.current(node);
    });

    act(() => {
      result.current(null);
    });

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
