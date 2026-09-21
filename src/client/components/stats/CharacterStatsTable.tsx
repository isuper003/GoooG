import { useState } from 'react';
import type { CharacterDTO } from '../../../shared/types';
import type { CharacterSort } from '../../lib/apiClient';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import ImageLightbox from '../gallery/ImageLightbox';

const CATEGORY_CLASSES: Record<string, string> = {
  trans: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  sluts: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  twinks: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

interface CharacterStatsTableProps {
  characters: CharacterDTO[];
  sort: CharacterSort;
  onSortChange: (sort: CharacterSort) => void;
}

export default function CharacterStatsTable({
  characters,
  sort,
  onSortChange,
}: CharacterStatsTableProps) {
  const [zoomCharacter, setZoomCharacter] = useState<CharacterDTO | null>(null);

  return (
    <div className="hairline-card rounded-2xl border border-white/10 p-6 sm:p-8 flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            Character Performance Stats
          </h2>
          <p className="text-xs sm:text-[13px] font-mono text-white/50 mt-0.5">
            Historical SRS review telemetry and precision accuracy
          </p>
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CharacterSort)}
          className="rounded-xl border border-white/10 bg-[#090d14] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-cyan-400 focus:outline-none font-mono cursor-pointer"
        >
          <option value="weakest">Sort: Weakest First</option>
          <option value="most_correct">Sort: Most Correct</option>
          <option value="least_correct">Sort: Least Correct</option>
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="category">Sort: Category</option>
        </select>
      </div>

      {characters.length === 0 ? (
        <p className="text-sm text-white/40 font-mono py-10 text-center">
          No character files on record.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
                <th className="pb-3.5 pr-4">Performer</th>
                <th className="pb-3.5 pr-4">Deck</th>
                <th className="pb-3.5 pr-4 text-center">Retention</th>
                <th className="pb-3.5 pr-4 text-right">Correct</th>
                <th className="pb-3.5 pr-4 text-right">Wrong</th>
                <th className="pb-3.5 text-right">SRS Mastery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {characters.map((c) => {
                const total = c.correctCount + c.wrongCount;
                const hasTests = total > 0;
                const acc = hasTests ? `${((c.correctCount / total) * 100).toFixed(1)}%` : '—';
                const avatar = c.images[0]?.url;
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-4 flex items-center gap-3.5 min-w-[200px]">
                      {/* Image enlarged by 60%: 32px * 1.6 = 51.2px, 40px * 1.6 = 64px with Zoom-in on click */}
                      <div
                        onClick={() => c.images.length > 0 && setZoomCharacter(c)}
                        className="w-[51px] h-[64px] rounded-lg overflow-hidden bg-black border border-white/10 shrink-0 shadow-sm cursor-zoom-in group/avatar relative hover:border-cyan-400/80 hover:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all select-none"
                        title={`Click to zoom ${c.name}`}
                      >
                        {avatar ? (
                          <img
                            src={toProxiedImageUrl(avatar)}
                            alt={c.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono backdrop-blur-[1px]">
                          🔍
                        </div>
                      </div>
                      <span
                        onClick={() => c.images.length > 0 && setZoomCharacter(c)}
                        className="font-sans font-bold text-white text-sm sm:text-base cursor-pointer hover:text-cyan-300 transition-colors"
                        title={`Click to zoom ${c.name}`}
                      >
                        {c.name}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase border ${
                          CATEGORY_CLASSES[c.categoryKey] ?? 'bg-white/10 text-white/70 border-white/20'
                        }`}
                      >
                        {c.categoryKey}
                      </span>
                    </td>
                    <td
                      className={`py-3.5 pr-4 text-center ${
                        hasTests ? 'text-cyan-400 font-bold' : 'text-white/30'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-bold">{acc}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-right text-emerald-400 font-bold text-sm sm:text-base">
                      +{c.correctCount}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-rose-400 font-bold text-sm sm:text-base">
                      -{c.wrongCount}
                    </td>
                    <td className="py-3.5 text-right text-amber-400 text-sm sm:text-base tracking-wider">
                      {'★'.repeat(Math.min(5, c.srsLevel))}
                      {'☆'.repeat(5 - Math.min(5, c.srsLevel))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Zoom-In Modal for Character Performance Stats */}
      {zoomCharacter && (
        <ImageLightbox
          images={zoomCharacter.images.map((img) => img.url)}
          characterName={zoomCharacter.name}
          categoryKey={zoomCharacter.categoryKey}
          initialIndex={0}
          onClose={() => setZoomCharacter(null)}
        />
      )}
    </div>
  );
}
