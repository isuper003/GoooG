import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WATCH_SITES, cleanSearchTitle } from '../../config/watchSites';

interface WatchSearchMenuProps {
  title: string;
  movieTitle?: string;
  castNames?: string[];
  studioName?: string;
  variant?: 'card' | 'detail';
}

export default function WatchSearchMenu({
  title,
  movieTitle,
  castNames,
  studioName,
  variant = 'detail',
}: WatchSearchMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<'scene' | 'movie'>('scene');
  const [copied, setCopied] = useState(false);

  // Clean titles
  const cleanedSceneTitle = cleanSearchTitle(title);
  const cleanedMovieTitle = movieTitle ? cleanSearchTitle(movieTitle) : '';

  const initialQuery =
    activeSource === 'movie' && cleanedMovieTitle ? cleanedMovieTitle : cleanedSceneTitle;

  const [customQuery, setCustomQuery] = useState(initialQuery);

  // Sync query when activeSource changes
  useEffect(() => {
    if (activeSource === 'movie' && cleanedMovieTitle) {
      setCustomQuery(cleanedMovieTitle);
    } else {
      setCustomQuery(cleanedSceneTitle);
    }
  }, [activeSource, cleanedMovieTitle, cleanedSceneTitle]);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleCopy() {
    if (!customQuery) return;
    navigator.clipboard.writeText(customQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenSite(buildUrl: (q: string) => string) {
    const queryToSearch = customQuery.trim() || title.trim();
    const targetUrl = buildUrl(queryToSearch);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      {/* Trigger Button */}
      {variant === 'card' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Search this scene on streaming sites"
          className="flex items-center gap-1.5 rounded-lg bg-black/75 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-400 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all shadow-md active:scale-95"
        >
          <span className="text-xs">🎬</span>
          <span>Watch</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Search this title on streaming sites"
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-1.5 text-xs font-bold text-cyan-300 transition-all shadow-sm active:scale-95"
        >
          <span className="text-sm">🎬</span>
          <span>Watch on Streaming Sites</span>
        </button>
      )}

      {/* Centered Modal rendered via Portal to escape any overflow:hidden clipping */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0c121d] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎬</span>
                    <h3 className="font-display text-lg font-bold text-white tracking-tight">
                      Watch on Streaming Sites
                    </h3>
                  </div>
                  <p className="text-xs text-white/50">
                    Search and stream this title directly on external platforms
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close modal"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Source Selector (Scene vs Full Movie) */}
              {cleanedMovieTitle && cleanedMovieTitle.toLowerCase() !== cleanedSceneTitle.toLowerCase() ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                    Search Target:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveSource('scene')}
                      className={`rounded-lg py-1.5 px-2 text-center truncate transition-all ${
                        activeSource === 'scene'
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                          : 'text-white/60 hover:text-white border border-transparent'
                      }`}
                      title={cleanedSceneTitle}
                    >
                      🎞️ Scene Title
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSource('movie')}
                      className={`rounded-lg py-1.5 px-2 text-center truncate transition-all ${
                        activeSource === 'movie'
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                          : 'text-white/60 hover:text-white border border-transparent'
                      }`}
                      title={cleanedMovieTitle}
                    >
                      📼 Full Movie
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Search Query Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                  Search Query:
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 focus-within:border-cyan-400/50">
                  <span className="text-white/40 text-xs">🔍</span>
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Enter keywords..."
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy title to clipboard"
                    className="shrink-0 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-black px-2 py-1 text-xs font-mono font-semibold text-white/80 transition-all"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                {/* Quick Append Chips: Studio & Cast */}
                {studioName || (castNames && castNames.length > 0) ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Append:</span>
                    {studioName && !customQuery.toLowerCase().includes(studioName.toLowerCase()) ? (
                      <button
                        type="button"
                        onClick={() => setCustomQuery((prev) => `${prev.trim()} ${studioName}`.trim())}
                        className="rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 px-2 py-0.5 text-xs text-white/70 transition-colors"
                      >
                        + {studioName}
                      </button>
                    ) : null}
                    {castNames?.slice(0, 3).map((name) =>
                      !customQuery.toLowerCase().includes(name.toLowerCase()) ? (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setCustomQuery((prev) => `${prev.trim()} ${name}`.trim())}
                          className="rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 px-2 py-0.5 text-xs text-white/70 transition-colors"
                        >
                          + {name}
                        </button>
                      ) : null
                    )}
                  </div>
                ) : null}
              </div>

              {/* 7 Watch Sites List */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                  Select Streaming Site ({WATCH_SITES.length}):
                </label>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {WATCH_SITES.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => handleOpenSite(site.buildSearchUrl)}
                      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-cyan-400/40 p-2.5 text-left transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {site.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border ${site.badgeColor}`}
                        >
                          {site.domain}
                        </span>
                      </div>

                      <span className="text-white/40 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all text-xs font-mono font-semibold">
                        Search ↗
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-white/40 font-mono">
                <span>Opens in a new browser tab</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-white font-sans text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
