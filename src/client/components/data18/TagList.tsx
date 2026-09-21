import type { Data18Tag } from '../../../shared/data18Types';

/** Tags grouped by their Data18 category label (Ethnicity, Hair, ...). */
export default function TagList({ tags }: { tags: Data18Tag[] }) {
  if (tags.length === 0) return null;

  const groups = new Map<string, Data18Tag[]>();
  for (const tag of tags) {
    const key = tag.category ?? 'Categories';
    groups.set(key, [...(groups.get(key) ?? []), tag]);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        <span>🏷️</span> Tags
      </h2>
      <div className="space-y-2">
        {[...groups.entries()].map(([category, items]) => (
          <div key={category} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 w-full sm:w-24 shrink-0">
              {category}
            </span>
            {items.map((tag) => (
              <a
                key={tag.slug}
                href={`https://www.data18.com/tags/${tag.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/80 hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-violet-200 transition-colors"
              >
                {tag.name}
              </a>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
