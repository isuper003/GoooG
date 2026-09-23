import type { PlayerLayoutMode } from '../../types/playerTypes';

interface PlayerTopBarProps {
  layoutMode: PlayerLayoutMode;
  onLayoutModeChange: (mode: PlayerLayoutMode) => void;
  isAllPlaying: boolean;
  onTogglePlayAll: () => void;
  isAllMuted: boolean;
  onToggleMuteAll: () => void;
  soloAudio: boolean;
  onToggleSoloAudio: () => void;
  onBatchAddFiles: (files: FileList | File[]) => void;
  onClearAll: () => void;
  totalVideosCount: number;
}

export default function PlayerTopBar({
  layoutMode,
  onLayoutModeChange,
  isAllPlaying,
  onTogglePlayAll,
  isAllMuted,
  onToggleMuteAll,
  soloAudio,
  onToggleSoloAudio,
  onBatchAddFiles,
  onClearAll,
  totalVideosCount,
}: PlayerTopBarProps) {
  return (
    <div className="w-full bg-[#070b12] border-b border-white/[0.08] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Left: Branding & Total Videos */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <span className="font-display text-sm font-bold text-white tracking-tight">Studio Player</span>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/60">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>{totalVideosCount} Loaded</span>
        </div>
      </div>

      {/* Middle: Layout Modes Switcher (Hidden on Mobile screens as requested) */}
      <div className="hidden md:flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
        {/* Mode 1: Single */}
        <button
          type="button"
          onClick={() => onLayoutModeChange('single')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            layoutMode === 'single'
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
          }`}
          title="Single Player Full Screen"
        >
          <span>⬛</span>
          <span>Single</span>
        </button>

        {/* Mode 2: Grid 2x2 */}
        <button
          type="button"
          onClick={() => onLayoutModeChange('grid-2x2')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            layoutMode === 'grid-2x2'
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
          }`}
          title="Grid 2x2 (4 Players)"
        >
          <span>⊞</span>
          <span>Grid 2×2</span>
        </button>

        {/* Mode 3: Quad 9:16 Columns */}
        <button
          type="button"
          onClick={() => onLayoutModeChange('quad-vertical')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            layoutMode === 'quad-vertical'
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
          }`}
          title="4 Vertical Players Side-by-Side (9:16 Portrait)"
        >
          <span>▮▮▮▮</span>
          <span>Quad 9:16</span>
        </button>

        {/* Mode 4: Hybrid 1 Left + 3 Stacked Right */}
        <button
          type="button"
          onClick={() => onLayoutModeChange('hybrid-1-3')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            layoutMode === 'hybrid-1-3'
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
          }`}
          title="1 Left (9:16) + 3 Stacked Right (16:9)"
        >
          <span>▮☰</span>
          <span>Hybrid 1+3</span>
        </button>
      </div>

      {/* Right: Master Control Actions */}
      <div className="flex items-center gap-2">
        {/* Solo Audio Mode Toggle */}
        <button
          type="button"
          onClick={onToggleSoloAudio}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
            soloAudio
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
              : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white'
          }`}
          title={soloAudio ? 'Solo Audio ON: Unmuting one player mutes others' : 'Solo Audio OFF: Multiple audios allowed'}
        >
          <span>🎯</span>
          <span className="hidden sm:inline">Solo Audio</span>
        </button>

        {/* Master Mute / Unmute All */}
        <button
          type="button"
          onClick={onToggleMuteAll}
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all flex items-center gap-1.5"
          title={isAllMuted ? 'Unmute All' : 'Mute All'}
        >
          <span>{isAllMuted ? '🔇' : '🔊'}</span>
          <span className="hidden sm:inline">{isAllMuted ? 'Unmute All' : 'Mute All'}</span>
        </button>

        {/* Master Play / Pause All */}
        <button
          type="button"
          onClick={onTogglePlayAll}
          className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5 active:scale-95"
          title={isAllPlaying ? 'Pause All' : 'Play All'}
        >
          <span>{isAllPlaying ? '⏸' : '▶'}</span>
          <span>{isAllPlaying ? 'Pause All' : 'Play All'}</span>
        </button>

        {/* Quick Batch File Upload */}
        <label
          className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-all shadow-md shadow-cyan-400/20 cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
          title="Add files to all players"
        >
          <span>📂</span>
          <span className="hidden sm:inline">Load Files</span>
          <input
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onBatchAddFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </label>

        {/* Clear All */}
        {totalVideosCount > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all videos across all players?')) {
                onClearAll();
              }
            }}
            className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center text-xs transition-colors shrink-0"
            title="Clear all players"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
