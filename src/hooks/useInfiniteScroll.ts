import { useCallback, useEffect, useRef } from "react";

/**
 * Reusable IntersectionObserver-based infinite scroll hook.
 * Returns a ref callback to attach to a sentinel element.
 */
export function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return sentinelRef;
}
