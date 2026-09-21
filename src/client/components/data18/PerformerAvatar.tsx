import { useState } from 'react';
import { toProxiedImageUrl } from '../../lib/imageUrl';

const CDN = 'https://cdn.dt18.com/images/names';

/** Data18 keeps performer photos in several sizes and not every size exists for everyone. */
export function performerImageCandidates(slug: string): string[] {
  return [`${CDN}/par/${slug}.jpg`, `${CDN}/med/${slug}.jpg`, `${CDN}/big/${slug}.jpg`];
}

interface PerformerAvatarProps {
  slug: string;
  name: string;
  className?: string;
  onClick?: () => void;
}

/** Performer photo that steps through the available sizes before giving up on an initial. */
export default function PerformerAvatar({ slug, name, className = '', onClick }: PerformerAvatarProps) {
  const candidates = performerImageCandidates(slug);
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className={`flex items-center justify-center bg-white/[0.06] text-white/40 font-bold ${className}`}>
        {name.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <img
      key={candidates[index]}
      src={toProxiedImageUrl(candidates[index])}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onClick={onClick}
      onError={() => setIndex((i) => i + 1)}
      className={className}
    />
  );
}
