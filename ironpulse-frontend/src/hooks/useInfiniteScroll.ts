import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  threshold?: string
}

export function useInfiniteScroll({ onLoadMore, hasMore, threshold = '200px' }: UseInfiniteScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries
    if (target.isIntersecting && hasMore) {
      onLoadMore()
    }
  }, [hasMore, onLoadMore])

  useEffect(() => {
    const element = observerTarget.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: `0px 0px ${threshold} 0px`,
      threshold: 0
    })

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [handleObserver, threshold])

  // Returns a ref to attach to the sentinel div at the bottom of the list
  return observerTarget
}
