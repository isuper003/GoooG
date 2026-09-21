import { useEffect, useRef } from 'react';

interface InfiniteFooterProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Set when loading the next page failed; the button then retries. */
  errorMessage?: string | null;
  loadedCount: number;
  totalCount?: number;
  onLoadMore: () => void;
}

/** Bottom of an endless list: loads the next page when scrolled into view, with a button fallback. */
export default function InfiniteFooter({
  hasNextPage,
  isFetchingNextPage,
  errorMessage,
  loadedCount,
  totalCount,
  onLoadMore,
}: InfiniteFooterProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  const canAutoLoad = hasNextPage && !isFetchingNextPage && !errorMessage;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canAutoLoad || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // Re-observe after every page: the sentinel may still be in view once new items render.
  }, [canAutoLoad, loadedCount]);

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-2 pt-4 border-t border-white/10">
      {errorMessage ? (
        <p className="text-xs text-rose-300">{errorMessage}</p>
      ) : null}

      {hasNextPage ? (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isFetchingNextPage ? 'Loading…' : errorMessage ? 'Retry' : 'Load more'}
        </button>
      ) : (
        <span className="text-[11px] font-mono text-white/40">End of list</span>
      )}

      <span className="text-[11px] font-mono text-white/30">
        {loadedCount.toLocaleString()}
        {totalCount ? ` of ${totalCount.toLocaleString()}` : ''} loaded
      </span>
    </div>
  );
}
