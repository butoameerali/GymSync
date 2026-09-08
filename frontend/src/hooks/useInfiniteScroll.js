import { useEffect, useRef } from 'react';

/**
 * useInfiniteScroll
 * Attach sentinelRef to a dummy div at the bottom of your list.
 * Automatically triggers onIntersect when scrolled into view.
 * 
 * @param {Object} options
 * @param {Function} options.onIntersect Callback when bottom is reached
 * @param {boolean} options.hasMore Whether there are more items to fetch
 * @param {boolean} options.isLoading Guard against duplicate fetches while already loading
 * @param {string} [options.rootMargin='200px'] Viewport prefetch margin
 */
export function useInfiniteScroll({ onIntersect, hasMore, isLoading, rootMargin = '200px' }) {
  const sentinelRef = useRef(null);
  const callbackRef = useRef(onIntersect);

  // Keep latest callback ref without triggering effect re-bind
  useEffect(() => {
    callbackRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          if (hasMore && !isLoading && typeof callbackRef.current === 'function') {
            callbackRef.current();
          }
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, rootMargin]);

  return sentinelRef;
}

export default useInfiniteScroll;
