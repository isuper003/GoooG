import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Data18EntityStats, Data18Named } from '../../../shared/data18Types';
import { performerHref, studioHref } from '../../lib/data18Nav';
import { useData18PerformerExtra } from '../../hooks/useData18';
import PerformerAvatar from './PerformerAvatar';

interface PerformerExtraPanelProps {
  slug: string;
  stats: Data18EntityStats;
}

const STAT_LABELS: { key: keyof Data18EntityStats; label: string; icon: string }[] = [
  { key: 'scenes', label: 'Scenes', icon: '🎬' },
  { key: 'movies', label: 'Movies', icon: '📼' },
  { key: 'vr', label: 'VR', icon: '🥽' },
  { key: 'directors', label: 'Directors', icon: '🎥' },
  { key: 'pairings', label: 'Co-stars', icon: '👥' },
  { key: 'studios', label: 'Studios', icon: '🏢' },
  { key: 'tags', label: 'Tags', icon: '🏷️' },
];

const CHIP_CLASS =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/80';

function Chip({ item, to }: { item: Data18Named; to?: string }) {
  const body = (
    <>
      {item.imageUrl ? (
        <PerformerAvatar slug={item.slug} name={item.name} className="h-6 w-6 rounded-full object-cover bg-black/40 text-[10px] flex items-center justify-center" />
      ) : null}
      <span className="truncate">{item.name}</span>
      {item.scenes !== undefined ? (
        <span className="rounded-full bg-black/30 px-1.5 text-[10px] font-mono text-white/50">
          {item.scenes}
        </span>
      ) : null}
    </>
  );

  return to ? (
    <Link
      to={to}
      className={`${CHIP_CLASS} hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200 transition-colors`}
    >
      {body}
    </Link>
  ) : (
    <span className={CHIP_CLASS}>{body}</span>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/40">{title}</h4>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export default function PerformerExtraPanel({ slug, stats }: PerformerExtraPanelProps) {
  const { data, isLoading, error } = useData18PerformerExtra(slug);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-5">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <span>🪪</span> Performer data
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAT_LABELS.filter((s) => stats[s.key] !== undefined).map((s) => (
          <div key={s.key} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-lg font-black text-white tabular-nums">
              {stats[s.key]!.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              {s.icon} {s.label}
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-xs font-mono text-white/40 animate-pulse">Loading studios, co-stars and tags…</p>
      ) : error ? (
        <p className="text-xs text-rose-300">
          {error instanceof Error ? error.message : 'Failed to load performer data'}
        </p>
      ) : data ? (
        <div className="space-y-4">
          {data.pairings.length > 0 ? (
            <Group title="Frequent co-stars (recent activity)">
              {data.pairings.map((p) => (
                <Chip key={p.slug} item={p} to={performerHref(p.slug)} />
              ))}
            </Group>
          ) : null}
          {data.studios.length > 0 ? (
            <Group title="Studios">
              {data.studios.map((s) => (
                <Chip key={s.slug} item={s} to={studioHref(s.slug)} />
              ))}
            </Group>
          ) : null}
          {data.tags.length > 0 ? (
            <Group title="Top tags">
              {data.tags.map((t) => (
                <Chip key={t.slug} item={t} />
              ))}
            </Group>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
