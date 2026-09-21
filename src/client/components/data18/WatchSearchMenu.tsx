import { useState, useRef, useEffect } from 'react';
import { WATCH_SITES, cleanSearchTitle } from '../../config/watchSites';

interface WatchSearchMenuProps {
  title: string;
  movieTitle?: string;
  castNames?: string[];
  studioName?: string;
  align?: 'left' | 'right';
  variant?: 'card' | 'detail';
}

export default function WatchSearchMenu({
  title,
  movieTitle,
  castNames,
  studioName,
  align = 'right',
  variant = 'card',
}: WatchSearchMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<'scene' | 'movie'>('scene');
  const [copied, setCopied] = useState(false);

  // Default query based on selected source
  const cleanedSceneTitle = cleanSearchTitle(title);
  const cleanedMovieTitle = movieTitle ? cleanSearchTitle(movieTitle) : '';

  const initialQuery =
    activeSource === 'movie' && cleanedMovieTitle ? cleanedMovieTitle : cleanedSceneTitle;

  const [customQuery, setCustomQuery] = useState(initialQuery);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync custom query when activeSource changes
  useEffect(() => {
    if (activeSource === 'movie' && cleanedMovieTitle) {
      setCustomQuery(cleanedMovieTitle);
    } else {
      setCustomQuery(cleanedSceneTitle);
    }
  }, [activeSource, cleanedMovieTitle, cleanedSceneTitle]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!customQuery) return;
    navigator.clipboard.writeText(customQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenSite(e: React.MouseEvent, buildUrl: (q: string) => string) {
    e.stopPropagation();
    const queryToSearch = customQuery.trim() || title.trim();
    const targetUrl = buildUrl(queryToSearch);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="relative inline-block" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      {/* Trigger Button */}
      {variant === 'card' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          title="Search this movie / scene on streaming sites"
          className="flex items-center gap-1.5 rounded-lg bg-black/75 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-400 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all shadow-md active:scale-95"
        >
          <span className="text-xs">🎬</span>
          <span>Watch</span>
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          title="Search this movie / scene on streaming sites"
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-1.5 text-xs font-bold text-cyan-300 transition-all shadow-sm active:scale-95"
        >
          <span className="text-sm">🎬</span>
          <span>Watch on Streaming Sites</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#0c121d]/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🍿</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                Watch &amp; Stream
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          {/* Source Toggle (if movie title differs from scene title) */}
          {cleanedMovieTitle && cleanedMovieTitle.toLowerCase() !== cleanedSceneTitle.toLowerCase() ? (
            <div className="mb-2.5 flex rounded-lg bg-black/40 p-0.5 border border-white/10 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveSource('scene')}
                className={`flex-1 rounded-md py-1 text-center transition-all ${
                  activeSource === 'scene'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Scene Title
              </button>
              <button
                type="button"
                onClick={() => setActiveSource('movie')}
                className={`flex-1 rounded-md py-1 text-center transition-all ${
                  activeSource === 'movie'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Full Movie
              </button>
            </div>
          ) : null}

          {/* Search Query Input + Copy Button */}
          <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 focus-within:border-cyan-400/50">
            <span className="text-white/30 text-xs">🔍</span>
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Search keyword..."
              className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              title="Copy title to clipboard"
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono text-white/60 hover:text-cyan-300 hover:bg-white/10 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Quick Query Modifiers: Studio & Cast */}
          {studioName || (castNames && castNames.length > 0) ? (
            <div className="mb-2.5 flex flex-wrap items-center gap-1">
              <span className="text-[9px] font-mono text-white/40 uppercase">Add:</span>
              {studioName && !customQuery.toLowerCase().includes(studioName.toLowerCase()) ? (
                <button
                  type="button"
                  onClick={() => setCustomQuery((prev) => `${prev.trim()} ${studioName}`.trim())}
                  className="rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 px-1.5 py-0.5 text-[10px] text-white/70 transition-colors"
                >
                  + {studioName}
                </button>
              ) : null}
              {castNames?.slice(0, 2).map((name) =>
                !customQuery.toLowerCase().includes(name.toLowerCase()) ? (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCustomQuery((prev) => `${prev.trim()} ${name}`.trim())}
                    className="rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 px-1.5 py-0.5 text-[10px] text-white/70 transition-colors"
                  >
                    + {name}
                  </button>
                ) : null
              )}
            </div>
          ) : null}

          {/* Sites Grid/List */}
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-0.5">
              Available Sites ({WATCH_SITES.length}):
            </span>

            {WATCH_SITES.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={(e) => handleOpenSite(e, site.buildSearchUrl)}
                className="group/btn flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 p-2 text-left transition-all"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover/btn:text-cyan-300 transition-colors">
                      {site.name}
                    </span>
                    <span
                      className={`rounded px-1 py-0.2 text-[9px] font-mono font-semibold border ${site.badgeColor}`}
                    >
                      {site.domain}
                    </span>
                  </div>
                </div>

                <span className="text-white/30 group-hover/btn:text-cyan-300 group-hover/btn:translate-x-0.5 transition-all text-xs font-mono">
                  Search ↗
                </span>
              </button>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-2.5 border-t border-white/[0.08] pt-2 text-center">
            <span className="text-[10px] font-mono text-white/40">
              Opens search results in a new tab
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
