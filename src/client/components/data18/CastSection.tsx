import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Data18CastMember } from '../../../shared/data18Types';
import { performerHref } from '../../lib/data18Nav';
import PerformerAvatar from './PerformerAvatar';
import PornPicsPanel from './PornPicsPanel';

interface CastSectionProps {
  title?: string;
  cast: (Data18CastMember & { avatarUrl: string })[];
}

/** Cast grid; the camera button opens a PornPics lookup for that performer. */
export default function CastSection({ title = 'Cast', cast }: CastSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  if (cast.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        <span>⭐</span> {title}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/60">
          {cast.length}
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cast.map((member) => {
          const isSelected = selected === member.name;
          return (
            <div
              key={member.slug}
              className={`group overflow-hidden rounded-2xl border bg-[#0c121d]/80 transition-colors ${
                isSelected ? 'border-pink-400/60' : 'border-white/10 hover:border-cyan-400/40'
              }`}
            >
              <Link to={performerHref(member.slug)} className="block aspect-square overflow-hidden bg-black/50">
                <PerformerAvatar
                  slug={member.slug}
                  name={member.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
              <div className="flex items-center justify-between gap-1.5 p-2.5">
                <Link
                  to={performerHref(member.slug)}
                  className="truncate text-xs font-semibold text-white hover:text-cyan-300 transition-colors"
                  title={member.name}
                >
                  {member.name}
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(isSelected ? null : member.name)}
                  title={`Search PornPics for ${member.name}`}
                  aria-pressed={isSelected}
                  className={`shrink-0 rounded-lg px-1.5 py-1 text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-pink-400 text-black' : 'bg-white/[0.06] text-white/70 hover:bg-pink-400/30'
                  }`}
                >
                  📸
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected ? <PornPicsPanel key={selected} name={selected} /> : null}
    </section>
  );
}
