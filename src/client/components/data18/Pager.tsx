import { useState } from 'react';

interface PagerProps {
  page: number;
  totalPages?: number;
  isLoading?: boolean;
  accent?: 'cyan' | 'amber' | 'white';
  onChange: (page: number) => void;
}

const ACCENT = {
  cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  white: 'bg-white/10 border-white/20 text-white',
};

export default function Pager({ page, totalPages, isLoading, accent = 'cyan', onChange }: PagerProps) {
  const [jump, setJump] = useState('');
  const last = totalPages && totalPages > 0 ? totalPages : undefined;

  function go(next: number) {
    const clamped = Math.max(1, last ? Math.min(last, next) : next);
    if (clamped !== page) onChange(clamped);
  }

  const btn =
    'rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={btn} disabled={page <= 1 || isLoading} onClick={() => go(page - 1)}>
        ← Previous
      </button>

      <span className={`rounded-xl border px-3 py-1 text-xs font-mono font-bold ${ACCENT[accent]}`}>
        Page {page}
        {last ? ` / ${last.toLocaleString()}` : ''}
      </span>

      <button
        type="button"
        className={btn}
        disabled={isLoading || (last !== undefined && page >= last)}
        onClick={() => go(page + 1)}
      >
        Next →
      </button>

      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseInt(jump, 10);
          if (Number.isFinite(n) && n >= 1) go(n);
          setJump('');
        }}
      >
        <input
          type="number"
          min={1}
          max={last}
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          placeholder="Go to…"
          aria-label="Go to page"
          className="w-20 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
        />
      </form>
    </div>
  );
}
