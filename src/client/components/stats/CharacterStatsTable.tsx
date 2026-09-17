import type { CharacterDTO } from '../../../shared/types';
import type { CharacterSort } from '../../lib/apiClient';

const CATEGORY_CLASSES: Record<string, string> = {
  male: 'bg-category-male/20 text-category-male',
  female: 'bg-category-female/20 text-category-female',
  boys: 'bg-category-boys/20 text-category-boys',
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
    <div className="rounded-card border border-bg-hover bg-bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-dim">
          Per-character stats
        </h2>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CharacterSort)}
          className="rounded-button border border-bg-hover bg-bg-muted px-2 py-1.5 text-xs text-fg"
        >
          <option value="weakest">Weakest first</option>
          <option value="most_correct">Most correct</option>
          <option value="least_correct">Least correct</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="category">Category</option>
        </select>
      </div>

      {characters.length === 0 ? (
        <p className="text-sm text-fg-muted">No characters yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-fg-dim">
                <th className="pb-2 pr-3">Name</th>
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 pr-3 text-right">Correct</th>
                <th className="pb-2 pr-3 text-right">Wrong</th>
                <th className="pb-2 text-right">SRS</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((c) => (
                <tr key={c.id} className="border-t border-bg-muted">
                  <td className="py-2 pr-3 font-medium text-fg">{c.name}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-badge px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        CATEGORY_CLASSES[c.categoryKey] ?? 'bg-bg-muted text-fg-muted'
                      }`}
                    >
                      {c.categoryKey}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-emerald-400">{c.correctCount}</td>
                  <td className="py-2 pr-3 text-right text-rose-400">{c.wrongCount}</td>
                  <td className="py-2 text-right text-fg-muted">{c.srsLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
