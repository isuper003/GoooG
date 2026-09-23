import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PlayerLayoutMode, PlaylistItem, LoopMode, FitMode, PanDirection } from '../types/playerTypes';
import VideoPlayerInstance from '../components/player/VideoPlayerInstance';
import MasterOverlayPlayer, { type MasterOverlayState } from '../components/player/MasterOverlayPlayer';

interface PlayerState {
  id: number;
  label: string;
  playlist: PlaylistItem[];
  currentIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isShuffle: boolean;
  loopMode: LoopMode;
  fitMode: FitMode;
}

const INITIAL_PLAYERS: PlayerState[] = [
  {
    id: 1,
    label: 'Player 1',
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    isMuted: false,
    volume: 1,
    isShuffle: false,
    loopMode: 'all',
    fitMode: 'contain',
  },
  {
    id: 2,
    label: 'Player 2',
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    isMuted: true,
    volume: 1,
    isShuffle: false,
    loopMode: 'all',
    fitMode: 'contain',
  },
  {
    id: 3,
    label: 'Player 3',
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    isMuted: true,
    volume: 1,
    isShuffle: false,
    loopMode: 'all',
    fitMode: 'contain',
  },
  {
    id: 4,
    label: 'Player 4',
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    isMuted: true,
    volume: 1,
    isShuffle: false,
    loopMode: 'all',
    fitMode: 'contain',
  },
];

const INITIAL_OVERLAY: MasterOverlayState = {
  playlist: [],
  isPlaying: false,
  isMuted: false,
  volume: 1,
  isLoop: true,
  isVisible: false,
  isKeyingEnabled: true,
  threshold: 0.16,
  feather: 0.04,
  opacity: 1,
  clickThrough: true,
};

export default function PlayerPage() {
  const [layoutMode, setLayoutMode] = useState<PlayerLayoutMode>('grid-2x2');
  const [players, setPlayers] = useState<PlayerState[]>(INITIAL_PLAYERS);
  const [overlayState, setOverlayState] = useState<MasterOverlayState>(INITIAL_OVERLAY);
  const [soloAudio, setSoloAudio] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayFileInputRef = useRef<HTMLInputElement>(null);
  const hudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update overlay player state
  const updateOverlay = useCallback((updates: Partial<MasterOverlayState>) => {
    setOverlayState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Set overlay subtitle single clip
  const handleSetOverlayFile = useCallback((file: File) => {
    const newItem: PlaylistItem = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      file: file,
    };
    setOverlayState((prev) => ({
      ...prev,
      playlist: [newItem], // Single clip only
      isVisible: true,
      isPlaying: true,
    }));
  }, []);

  // Responsive check: if screen is mobile, enforce single player mode
  useEffect(() => {
    function checkMobile() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setLayoutMode('single');
      }
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update a single player state
  const updatePlayer = useCallback((id: number, updates: Partial<PlayerState>) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  // Switch layout mode: automatically pause inactive players when switching to single
  const handleLayoutModeChange = useCallback((newMode: PlayerLayoutMode) => {
    if (newMode === 'single') {
      // Pause players 2, 3, 4 immediately to save decoders and CPU
      setPlayers((prev) =>
        prev.map((p) => (p.id > 1 ? { ...p, isPlaying: false } : p))
      );
    }
    setLayoutMode(newMode);
  }, []);

  // Solo Audio Handler: unmuting player X mutes all others
  const handleSoloAudioRequest = useCallback(
    (unmutedId: number) => {
      if (!soloAudio) return;
      setPlayers((prev) =>
        prev.map((p) => (p.id !== unmutedId ? { ...p, isMuted: true } : p))
      );
    },
    [soloAudio]
  );

  // Total videos count
  const totalVideosCount = useMemo(() => {
    return players.reduce((sum, p) => sum + p.playlist.length, 0);
  }, [players]);

  // Master Play / Pause All
  const isAnyPlaying = players.some((p) => p.isPlaying) || overlayState.isPlaying;
  const handleTogglePlayAll = useCallback(() => {
    const nextPlaying = !isAnyPlaying;
    setPlayers((prev) =>
      prev.map((p) => {
        if (layoutMode === 'single' && p.id > 1) return { ...p, isPlaying: false };
        if (p.playlist.length === 0) return { ...p, isPlaying: false };
        return { ...p, isPlaying: nextPlaying };
      })
    );
    if (overlayState.playlist.length > 0) {
      setOverlayState((prev) => ({ ...prev, isPlaying: nextPlaying }));
    }
  }, [isAnyPlaying, layoutMode, overlayState.playlist.length]);

  // Master Mute / Unmute All
  const isAnyUnmuted = players.some((p) => !p.isMuted);
  const handleToggleMuteAll = useCallback(() => {
    if (isAnyUnmuted) {
      setPlayers((prev) => prev.map((p) => ({ ...p, isMuted: true })));
    } else {
      setPlayers((prev) =>
        prev.map((p) => (p.id === 1 ? { ...p, isMuted: false } : { ...p, isMuted: true }))
      );
    }
  }, [isAnyUnmuted]);

  // Batch Add Files: distribute cyclically across active players
  const handleBatchAddFiles = useCallback((fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    if (layoutMode === 'single' || isMobile) {
      const newItems: PlaylistItem[] = rawFiles.map((f) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        size: f.size,
        file: f,
      }));
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === 1) {
            const updated = [...p.playlist, ...newItems];
            return {
              ...p,
              playlist: updated,
              isPlaying: p.playlist.length === 0 ? true : p.isPlaying,
            };
          }
          return p;
        })
      );
      return;
    }

    const buckets: PlaylistItem[][] = [[], [], [], []];
    rawFiles.forEach((f, idx) => {
      const bucketIdx = idx % 4;
      buckets[bucketIdx].push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        size: f.size,
        file: f,
      });
    });

    setPlayers((prev) =>
      prev.map((p, idx) => {
        const added = buckets[idx];
        if (added.length === 0) return p;
        const updated = [...p.playlist, ...added];
        return {
          ...p,
          playlist: updated,
          isPlaying: p.playlist.length === 0 ? true : p.isPlaying,
        };
      })
    );
  }, [layoutMode, isMobile]);

  // Toggle Browser Fullscreen
  const handleToggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-hide floating HUD
  const resetHudTimer = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setIsHudVisible(false);
    }, 2400);
  }, []);

  // Mouse or touch near top reveals HUD
  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.clientY < 80) {
      resetHudTimer();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0] && e.touches[0].clientY < 95) {
      resetHudTimer();
    }
  };

  // Initial HUD timer on mount
  useEffect(() => {
    resetHudTimer();
    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [resetHudTimer]);

  // Global Keyboard Shortcuts (1-4, F, Space, M, O, H, T)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '1') {
        handleLayoutModeChange('single');
      } else if (e.key === '2' && !isMobile) {
        handleLayoutModeChange('grid-2x2');
      } else if (e.key === '3' && !isMobile) {
        handleLayoutModeChange('quad-vertical');
      } else if (e.key === '4' && !isMobile) {
        handleLayoutModeChange('hybrid-1-3');
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleBrowserFullscreen();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlayAll();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMuteAll();
      } else if (e.key === 'o' || e.key === 'O' || e.key === 'l' || e.key === 'L') {
        fileInputRef.current?.click();
      } else if (e.key === 't' || e.key === 'T') {
        if (overlayState.playlist.length === 0) {
          overlayFileInputRef.current?.click();
        } else {
          setOverlayState((prev) => ({ ...prev, isVisible: !prev.isVisible }));
        }
      } else if (e.key === 'h' || e.key === 'H') {
        setIsHudVisible((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLayoutModeChange, handleToggleBrowserFullscreen, handleTogglePlayAll, handleToggleMuteAll, isMobile, overlayState.playlist.length]);

  // Helper to render a player instance
  const renderPlayer = (id: number, panDirection: PanDirection = 'none') => {
    const p = players.find((item) => item.id === id);
    if (!p) return null;

    return (
      <VideoPlayerInstance
        key={p.id}
        id={p.id}
        label={p.label}
        playlist={p.playlist}
        currentIndex={p.currentIndex}
        isPlaying={p.isPlaying}
        isMuted={p.isMuted}
        volume={p.volume}
        isShuffle={p.isShuffle}
        loopMode={p.loopMode}
        fitMode={p.fitMode}
        panDirection={panDirection}
        onPlaylistChange={(pl) => updatePlayer(p.id, { playlist: pl })}
        onCurrentIndexChange={(idx) => updatePlayer(p.id, { currentIndex: idx })}
        onPlayingChange={(playing) => updatePlayer(p.id, { isPlaying: playing })}
        onMutedChange={(muted) => updatePlayer(p.id, { isMuted: muted })}
        onVolumeChange={(vol) => updatePlayer(p.id, { volume: vol })}
        onShuffleToggle={() => updatePlayer(p.id, { isShuffle: !p.isShuffle })}
        onLoopModeToggle={() => {
          const nextLoop: LoopMode =
            p.loopMode === 'all' ? 'one' : p.loopMode === 'one' ? 'off' : 'all';
          updatePlayer(p.id, { loopMode: nextLoop });
        }}
        onFitModeToggle={() => {
          updatePlayer(p.id, { fitMode: p.fitMode === 'contain' ? 'cover' : 'contain' });
        }}
        onSoloAudioRequest={handleSoloAudioRequest}
      />
    );
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      className="fixed inset-0 w-screen h-screen bg-black text-white overflow-hidden select-none m-0 p-0"
    >
      {/* Hidden File Input for Keyboard / Top HUD */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchAddFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden File Input for Subtitle Overlay (Single Clip) */}
      <input
        ref={overlayFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleSetOverlayFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Floating Auto-Hiding HUD (Appears only on mouse near top or hover, completely fades out during playback) */}
      <div
        onMouseEnter={() => {
          setIsHudVisible(true);
          if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        }}
        onMouseLeave={resetHudTimer}
        className={`fixed top-[max(20px,env(safe-area-inset-top,20px))] sm:top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 max-w-[calc(100vw-40px)] ${
          isHudVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-5 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#090d16]/90 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/80 overflow-x-auto [scrollbar-width:none]">
          {/* Mode Switcher Buttons (Hidden on mobile) */}
          {!isMobile && (
            <>
              <div className="flex items-center bg-black/50 rounded-xl p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => handleLayoutModeChange('single')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    layoutMode === 'single'
                      ? 'bg-cyan-400 text-black shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Single Player (Key 1)"
                >
                  1
                </button>

                <button
                  type="button"
                  onClick={() => handleLayoutModeChange('grid-2x2')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    layoutMode === 'grid-2x2'
                      ? 'bg-cyan-400 text-black shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Grid 2×2 (Key 2)"
                >
                  2×2
                </button>

                <button
                  type="button"
                  onClick={() => handleLayoutModeChange('quad-vertical')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    layoutMode === 'quad-vertical'
                      ? 'bg-cyan-400 text-black shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="4 Vertical 9:16 Columns (Key 3)"
                >
                  9:16
                </button>

                <button
                  type="button"
                  onClick={() => handleLayoutModeChange('hybrid-1-3')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    layoutMode === 'hybrid-1-3'
                      ? 'bg-cyan-400 text-black shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="1 Left + 3 Right (Key 4)"
                >
                  1+3
                </button>
              </div>

              <div className="h-4 w-px bg-white/15 mx-1" />
            </>
          )}

          {/* Load Files Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Load Video Files (Key O)"
          >
            <span>📂</span>
            <span className="hidden sm:inline">Load</span>
          </button>

          {/* Master Play / Pause */}
          <button
            type="button"
            onClick={handleTogglePlayAll}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition-all"
            title="Play/Pause All (Space)"
          >
            {isAnyPlaying ? '⏸' : '▶'}
          </button>

          {/* Master Mute / Unmute */}
          <button
            type="button"
            onClick={handleToggleMuteAll}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-all"
            title={isAnyUnmuted ? 'Mute All (M)' : 'Unmute All (M)'}
          >
            {isAnyUnmuted ? '🔊' : '🔇'}
          </button>

          {/* Solo Audio Mode */}
          <button
            type="button"
            onClick={() => setSoloAudio(!soloAudio)}
            className={`px-2 h-8 rounded-xl border text-[11px] font-mono transition-all flex items-center gap-1 ${
              soloAudio
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'text-white/40 border-white/10 hover:text-white'
            }`}
            title="Toggle Solo Audio (Key S)"
          >
            <span>🎯</span>
            <span className="hidden md:inline">Solo</span>
          </button>

          {/* Subtitle Overlay Trigger */}
          <button
            type="button"
            onClick={() => {
              if (overlayState.playlist.length === 0) {
                overlayFileInputRef.current?.click();
              } else {
                updateOverlay({ isVisible: !overlayState.isVisible });
              }
            }}
            className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              overlayState.playlist.length > 0 && overlayState.isVisible
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                : overlayState.playlist.length > 0
                ? 'bg-white/10 text-white/50 border-white/15'
                : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
            }`}
            title={
              overlayState.playlist.length === 0
                ? 'Load Subtitle Video Overlay (Key T)'
                : overlayState.isVisible
                ? 'Hide Subtitle Overlay (Key T)'
                : 'Show Subtitle Overlay (Key T)'
            }
          >
            <span>💬</span>
            <span className="hidden sm:inline">Subtitles</span>
            {overlayState.playlist.length > 0 && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  overlayState.isVisible ? 'bg-purple-400 animate-pulse' : 'bg-white/40'
                }`}
              />
            )}
          </button>

          {/* Browser Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleBrowserFullscreen}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all ${
              isFullscreen
                ? 'bg-cyan-400 text-black'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Toggle Fullscreen (F)"
          >
            ⛶
          </button>

          {/* Clear All */}
          {(totalVideosCount > 0 || overlayState.playlist.length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all videos?')) {
                  setPlayers(INITIAL_PLAYERS);
                  setOverlayState(INITIAL_OVERLAY);
                }
              }}
              className="w-8 h-8 rounded-xl hover:bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs transition-colors"
              title="Clear All Videos"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Main Screen: Edge-to-Edge Pure Video Wall with ZERO gaps and ZERO borders */}
      <div className="w-full h-full m-0 p-0 overflow-hidden bg-black">
        {/* Mode 1: Single Player */}
        {layoutMode === 'single' && (
          <div className="w-full h-full m-0 p-0 overflow-hidden">
            {renderPlayer(1)}
          </div>
        )}

        {/* Mode 2: Grid 2x2 (4 Players: 2 top, 2 bottom, 0 gap, 0 borders) */}
        {layoutMode === 'grid-2x2' && !isMobile && (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0 m-0 p-0 overflow-hidden">
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(1)}</div>
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(2)}</div>
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(3)}</div>
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(4)}</div>
          </div>
        )}

        {/* Mode 3: Quad Vertical (4 vertical columns, 0 gap, 0 borders) */}
        {layoutMode === 'quad-vertical' && !isMobile && (
          <div className="w-full h-full grid grid-cols-4 gap-0 m-0 p-0 overflow-hidden">
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(1)}</div>
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(2)}</div>
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(3)}</div>
            <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(4)}</div>
          </div>
        )}

        {/* Mode 4: Hybrid (1 Left 9:16 with Horizontal Pan + 3 Stacked Right 16:9 with Vertical Pan) */}
        {layoutMode === 'hybrid-1-3' && !isMobile && (
          <div className="w-full h-full grid grid-cols-12 gap-0 m-0 p-0 overflow-hidden">
            {/* Left 9:16 Column (Horizontal Scroll & Pan: Left/Right) */}
            <div className="col-span-5 h-full min-h-0 min-w-0 overflow-hidden">
              {renderPlayer(1, 'x')}
            </div>

            {/* Right: 3 Stacked Horizontal Rows (Vertical Scroll & Pan: Up/Down) */}
            <div className="col-span-7 h-full grid grid-rows-3 gap-0 m-0 p-0 overflow-hidden">
              <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(2, 'y')}</div>
              <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(3, 'y')}</div>
              <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{renderPlayer(4, 'y')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Master Subtitle Overlay Player (Single Clip, Rendered strictly ON TOP of the video wall) */}
      <MasterOverlayPlayer
        state={overlayState}
        onUpdateState={updateOverlay}
      />
    </div>
  );
}
