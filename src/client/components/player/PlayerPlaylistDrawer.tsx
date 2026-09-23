import { useState, useMemo } from 'react';
import type { PlaylistItem } from '../../types/playerTypes';

interface PlayerPlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistItem[];
  currentIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearPlaylist: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  playerLabel: string;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function PlayerPlaylistDrawer({
  isOpen,
  onClose,
  playlist,
  currentIndex,
  onSelectTrack,
  onRemoveTrack,
  onClearPlaylist,
  onAddFiles,
  playerLabel,
}: PlayerPlaylistDrawerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return playlist.map((item, originalIndex) => ({ item, originalIndex }));
    }
    const q = search.trim().toLowerCase();
    return playlist
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.name.toLowerCase().includes(q));
  }, [playlist, search]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-start sm:items-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-96 max-h-[85%] sm:max-h-full h-full bg-[#0a0f18] border-l border-white/10 flex flex-col shadow-2xl p-4 overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-sm font-bold">📋 {playerLabel}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono">
                {playlist.length} {playlist.length === 1 ? 'video' : 'videos'}
              </span>
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">Click to play any video immediately</p>
          </div>

          <div className="flex items-center gap-2">
            <label
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-colors"
              title="Add more videos"
            >
              <span>+ Add</span>
              <input
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="py-2.5 flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Search playlist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
          />

          {playlist.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all videos from this playlist?')) {
                  onClearPlaylist();
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Clear playlist"
            >
              Clear
            </button>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {filtered.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-white/40 text-xs">
              <span>📭 No matching videos</span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-2 text-cyan-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map(({ item, originalIndex }) => {
              const isActive = originalIndex === currentIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectTrack(originalIndex)}
                  className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-sm shadow-cyan-500/10'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                        isActive
                          ? 'bg-cyan-400 text-black animate-pulse'
                          : 'bg-white/10 text-white/60 group-hover:bg-white/20'
                      }`}
                    >
                      {isActive ? '▶' : originalIndex + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-medium ${
                          isActive ? 'text-cyan-300 font-semibold' : 'text-white/90'
                        }`}
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <span className="text-[10px] font-mono text-white/40">
                        {formatBytes(item.size)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(originalIndex);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-all text-white/40"
                    title="Remove from playlist"
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
