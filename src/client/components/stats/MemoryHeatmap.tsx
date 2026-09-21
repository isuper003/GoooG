import { useState, useRef, useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useHeatmap } from '../../hooks/useStats';
import { usePresetSession } from '../../hooks/usePresetSession';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import type { HeatmapCell } from '../../../shared/types';
import type { HeatCellState } from '../../../shared/srs';

const CATEGORY_LABELS: Record<string, string> = {
  trans: 'Trans',
  sluts: 'Sluts',
  twinks: 'Twinks',
};

const STATE_COLORS: Record<HeatCellState, string> = {
  mastered: 'bg-emerald-400',
  solid: 'bg-cyan-400',
  learning: 'bg-amber-400',
  critical: 'bg-rose-500',
  unseen: 'bg-white/10',
};

const STATE_BADGE_CLASSES: Record<HeatCellState, string> = {
  mastered: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
  solid: 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30',
  learning: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
  critical: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  unseen: 'bg-white/10 text-white/60 border border-white/10',
};

const LEGEND_ITEMS: Array<{ state: HeatCellState; label: string }> = [
  { state: 'mastered', label: 'Mastered' },
  { state: 'solid', label: 'Solid' },
  { state: 'learning', label: 'Learning' },
  { state: 'critical', label: 'Critical' },
  { state: 'unseen', label: 'Unseen' },
];

interface MemoryHeatmapProps {
  className?: string;
}

export default function MemoryHeatmap({ className }: MemoryHeatmapProps = {}): ReactElement | null {
  const { data } = useHeatmap();
  const { startPresetSession, isStarting, startError } = usePresetSession();

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const debounceTimerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  useEffect(() => {
    if (hoveredId === null) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-heatmap-cell]')) {
        return;
      }
      clearTimer();
      setHoveredId(null);
      setAnchorRect(null);
    };

    const handleScroll = () => {
      clearTimer();
      setHoveredId(null);
      setAnchorRect(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hoveredId]);

  const { data: character, isLoading: characterLoading } = useQuery({
    queryKey: ['character', hoveredId],
    queryFn: () => (hoveredId !== null ? apiClient.getCharacter(hoveredId) : Promise.reject(new Error('No ID'))),
    enabled: hoveredId !== null,
    staleTime: Infinity,
  });

  const cells = data?.cells;

  const categoryGroups = useMemo(() => {
    if (!cells || cells.length === 0) return [];
    const map = new Map<string, HeatmapCell[]>();
    for (const cell of cells) {
      const list = map.get(cell.categoryKey);
      if (list) {
        list.push(cell);
      } else {
        map.set(cell.categoryKey, [cell]);
      }
    }
    return Array.from(map.entries()).map(([categoryKey, groupCells]) => ({
      categoryKey,
      cells: groupCells,
    }));
  }, [cells]);

  const hoveredCell = useMemo(() => {
    if (hoveredId === null || !cells) return null;
    return cells.find((c) => c.id === hoveredId) ?? null;
  }, [hoveredId, cells]);

  if (!data || !cells || cells.length === 0) {
    return null;
  }

  const mastered = data.byState.mastered ?? 0;
  const solid = data.byState.solid ?? 0;
  const unseen = data.byState.unseen ?? 0;
  const total = cells.length;
  const studiedCount = total - unseen;
  const stabilityPct = studiedCount > 0 ? Math.round(((mastered + solid) / studiedCount) * 100) : null;

  const handlePointerEnter = (cell: HeatmapCell, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return;
    clearTimer();
    const rect = e.currentTarget.getBoundingClientRect();
    debounceTimerRef.current = window.setTimeout(() => {
      setHoveredId(cell.id);
      setAnchorRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }, 250);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return;
    clearTimer();
    setHoveredId(null);
    setAnchorRect(null);
  };

  const handleCellClick = (cell: HeatmapCell, e: React.MouseEvent<HTMLButtonElement>) => {
    clearTimer();
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredId(cell.id);
    setAnchorRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  };

  const getCardStyle = (): React.CSSProperties => {
    if (!anchorRect || typeof window === 'undefined') {
      return { display: 'none' };
    }
    const cardWidth = 260;
    const cardHeight = 84;
    const center = anchorRect.left + anchorRect.width / 2;
    const left = Math.max(12, Math.min(window.innerWidth - cardWidth - 12, center - cardWidth / 2));
    const spaceAbove = anchorRect.top;
    const top =
      spaceAbove >= cardHeight + 16
        ? anchorRect.top - cardHeight - 8
        : anchorRect.top + anchorRect.height + 8;

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${cardWidth}px`,
      zIndex: 50,
    };
  };

  return (
    <div
      className={`hairline-card rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col gap-5 ${
        className ?? ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-white">Memory Heatmap</h2>
            <span className="text-[11px] font-mono text-cyan-400">
              {total} {total === 1 ? 'Performer' : 'Performers'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-xs text-white/50">Memory Stability:</span>
            <span className="font-mono text-sm font-bold text-cyan-400">
              {stabilityPct !== null ? `${stabilityPct}%` : '—'}
            </span>
            <span className="text-[11px] font-mono text-white/40">
              (of {studiedCount} studied)
            </span>
          </div>
        </div>

        {data.byState.critical > 0 && (
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <button
              type="button"
              disabled={isStarting}
              onClick={() => startPresetSession('critical', data.byState.critical)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-mono text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              {isStarting ? (
                <>
                  <span className="inline-block animate-spin font-mono text-xs leading-none">⟳</span>
                  <span>Starting Drill...</span>
                </>
              ) : (
                <span>Train Critical ({data.byState.critical}) →</span>
              )}
            </button>
            {startError && (
              <span className="text-[11px] font-mono text-rose-300 max-w-xs text-left sm:text-right">
                {startError}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {categoryGroups.map((group) => {
          const categoryLabel = CATEGORY_LABELS[group.categoryKey] ?? group.categoryKey;
          return (
            <section key={group.categoryKey} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white uppercase tracking-wider">
                  {categoryLabel}
                </span>
                <span className="text-white/40">
                  {group.cells.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.cells.map((cell) => (
                  <button
                    key={cell.id}
                    type="button"
                    data-heatmap-cell
                    title={cell.name}
                    aria-label={cell.name}
                    onPointerEnter={(e) => handlePointerEnter(cell, e)}
                    onPointerLeave={handlePointerLeave}
                    onClick={(e) => handleCellClick(cell, e)}
                    className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 focus:outline-none focus:ring-1 focus:ring-white/50 cursor-pointer shrink-0 ${
                      STATE_COLORS[cell.state]
                    }`}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono pt-3 border-t border-white/[0.08]">
        {LEGEND_ITEMS.map(({ state, label }) => (
          <div key={state} className="flex items-center gap-1.5">
            <span className={`w-3.5 h-3.5 rounded-[3px] shrink-0 ${STATE_COLORS[state]}`} />
            <span className="text-white/60">{label}</span>
            <span className="text-white/40 font-bold">({data.byState[state] ?? 0})</span>
          </div>
        ))}
      </div>

      {hoveredCell && anchorRect && (
        <div
          style={getCardStyle()}
          className="pointer-events-none hairline-card rounded-2xl border border-white/20 bg-[#04060a]/95 backdrop-blur-md p-3 shadow-2xl flex items-center gap-3"
        >
          {character?.images && character.images.length > 0 ? (
            <img
              src={toProxiedImageUrl(character.images[0].url)}
              alt={hoveredCell.name}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 bg-white/5"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl border border-white/10 shrink-0 bg-white/5 flex items-center justify-center text-white/40 text-xs font-mono">
              {characterLoading ? (
                <span className="inline-block animate-spin font-mono text-xs leading-none">⟳</span>
              ) : (
                'No img'
              )}
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="font-display font-bold text-white text-sm leading-tight truncate">
              {hoveredCell.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white/60">
                SRS Lvl <strong className="text-cyan-400 font-bold">{hoveredCell.srsLevel}</strong>
              </span>
              <span
                className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  STATE_BADGE_CLASSES[hoveredCell.state]
                }`}
              >
                {hoveredCell.state}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
