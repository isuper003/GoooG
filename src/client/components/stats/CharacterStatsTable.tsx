import type { CharacterDTO } from '../../../shared/types';
import type { CharacterSort } from '../../lib/apiClient';
import { toProxiedImageUrl } from '../../lib/imageUrl';

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
  return (
    <div className="hairline-card rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div>
          <h2 className="font-display text-lg font-bold text-white">
            Character Performance Stats
          </h2>
          <p className="text-[11px] font-mono text-white/50">
            Historical SRS review telemetry and precision accuracy
          </p>
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CharacterSort)}
          className="rounded-xl border border-white/10 bg-[#090d14] px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
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
        <p className="text-xs text-white/40 font-mono py-8 text-center">
          No character files on record.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
                <th className="pb-3 pr-3">Performer</th>
                <th className="pb-3 pr-3">Deck</th>
                <th className="pb-3 pr-3 text-center">Retention</th>
                <th className="pb-3 pr-3 text-right">Correct</th>
                <th className="pb-3 pr-3 text-right">Wrong</th>
                <th className="pb-3 text-right">SRS Mastery</th>
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
                    <td className="py-2.5 pr-3 flex items-center gap-2.5">
                      <div className="w-8 h-10 rounded-md overflow-hidden bg-black border border-white/10 shrink-0">
                        {avatar ? (
                          <img
                            src={toProxiedImageUrl(avatar)}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        ) : null}
                      </div>
                      <span className="font-sans font-bold text-white text-xs">{c.name}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          CATEGORY_CLASSES[c.categoryKey] ?? 'bg-white/10 text-white/70 border-white/20'
                        }`}
                      >
                        {c.categoryKey}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 pr-3 text-center ${
                        hasTests ? 'text-cyan-400 font-bold' : 'text-white/30'
                      }`}
                    >
                      {acc}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-emerald-400">+{c.correctCount}</td>
                    <td className="py-2.5 pr-3 text-right text-rose-400">-{c.wrongCount}</td>
                    <td className="py-2.5 text-right text-amber-400">
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
    </div>
  );
}
