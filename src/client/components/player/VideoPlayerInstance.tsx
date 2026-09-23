import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import type { PlaylistItem, LoopMode, FitMode, PanDirection } from '../../types/playerTypes';
import PlayerPlaylistDrawer from './PlayerPlaylistDrawer';

interface VideoPlayerInstanceProps {
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
  panDirection?: PanDirection;
  onPlaylistChange: (items: PlaylistItem[]) => void;
  onCurrentIndexChange: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onMutedChange: (muted: boolean) => void;
  onVolumeChange: (vol: number) => void;
  onShuffleToggle: () => void;
  onLoopModeToggle: () => void;
  onFitModeToggle: () => void;
  onSoloAudioRequest?: (id: number) => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const formattedM = m < 10 ? `0${m}` : `${m}`;
  const formattedS = s < 10 ? `0${s}` : `${s}`;
  return `${formattedM}:${formattedS}`;
}

export default function VideoPlayerInstance({
  id,
  label,
  playlist,
  currentIndex,
  isPlaying,
  isMuted,
  volume,
  isShuffle,
  loopMode,
  fitMode,
  onPlaylistChange,
  onCurrentIndexChange,
  onPlayingChange,
  onMutedChange,
  onVolumeChange,
  onShuffleToggle,
  onLoopModeToggle,
  onFitModeToggle,
  panDirection = 'none',
  onSoloAudioRequest,
}: VideoPlayerInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingPanRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const hasMovedSignificantlyRef = useRef(false);

  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Center pan scroll position
  const centerPan = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || panDirection === 'none') return;
    if (panDirection === 'x') {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        el.scrollLeft = maxScroll / 2;
      }
    } else if (panDirection === 'y') {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        el.scrollTop = maxScroll / 2;
      }
    }
  }, [panDirection]);

  // Re-center on track change
  useEffect(() => {
    if (activeUrl && panDirection !== 'none') {
      const t = setTimeout(centerPan, 100);
      return () => clearTimeout(t);
    }
  }, [activeUrl, panDirection, centerPan]);

  // Pointer drag-to-pan handlers
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || panDirection === 'none') return;
    const el = scrollContainerRef.current;
    if (!el) return;

    isDraggingPanRef.current = true;
    hasMovedSignificantlyRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingPanRef.current || panDirection === 'none') return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedSignificantlyRef.current = true;
    }

    if (panDirection === 'x') {
      el.scrollLeft = dragStartRef.current.scrollLeft - dx;
    } else if (panDirection === 'y') {
      el.scrollTop = dragStartRef.current.scrollTop - dy;
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDraggingPanRef.current) {
      isDraggingPanRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  };

  const handleVideoClick = () => {
    if (hasMovedSignificantlyRef.current) {
      hasMovedSignificantlyRef.current = false;
      return;
    }
    onPlayingChange(!isPlaying);
  };

  const currentItem = playlist[currentIndex] as PlaylistItem | undefined;

  // 1. Lazy URL Management (Zero Memory Leaks):
  // Create object URL only for the active track, revoke immediately when switching or unmounting.
  useEffect(() => {
    let newUrl: string | null = null;
    if (currentItem?.file) {
      newUrl = URL.createObjectURL(currentItem.file);
    } else if (currentItem?.directUrl) {
      newUrl = currentItem.directUrl;
    }

    setActiveUrl(newUrl);
    setCurrentTime(0);

    return () => {
      if (newUrl && newUrl.startsWith('blob:')) {
        URL.revokeObjectURL(newUrl);
      }
    };
  }, [currentItem]);

  // Sync play/pause with external state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    if (isPlaying) {
      video.play().catch((err) => {
        if (err?.name === 'AbortError') return;
        console.warn(`[Player ${id}] Autoplay prevented:`, err);
        onPlayingChange(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, activeUrl, id, onPlayingChange]);

  // Sync volume and mute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Auto-hide controls timer
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    } else {
      resetHideTimer();
    }
  }, [isPlaying, resetHideTimer]);

  // Navigation handlers
  const handleNextTrack = useCallback(() => {
    if (playlist.length <= 1) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        void videoRef.current.play();
      }
      return;
    }

    if (isShuffle) {
      // Pick random different index
      let nextIndex = Math.floor(Math.random() * playlist.length);
      if (nextIndex === currentIndex) {
        nextIndex = (currentIndex + 1) % playlist.length;
      }
      onCurrentIndexChange(nextIndex);
    } else {
      onCurrentIndexChange((currentIndex + 1) % playlist.length);
    }
  }, [playlist.length, isShuffle, currentIndex, onCurrentIndexChange]);

  const handlePrevTrack = useCallback(() => {
    if (playlist.length <= 1) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      return;
    }
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    onCurrentIndexChange(prevIndex);
  }, [playlist.length, currentIndex, onCurrentIndexChange]);

  // Video event handlers
  const handleEnded = () => {
    if (loopMode === 'one') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        void videoRef.current.play();
      }
      return;
    }

    if (loopMode === 'off' && !isShuffle && currentIndex >= playlist.length - 1) {
      onPlayingChange(false);
      return;
    }

    handleNextTrack();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      if (isPlaying) {
        void videoRef.current.play().catch((err) => {
          if (err?.name === 'AbortError') return;
          onPlayingChange(false);
        });
      }
    }
  };

  // Adding local files
  const handleAddFiles = (fileList: FileList | File[]) => {
    const newItems: PlaylistItem[] = Array.from(fileList).map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      size: f.size,
      file: f,
    }));

    if (newItems.length === 0) return;

    const updated = [...playlist, ...newItems];
    onPlaylistChange(updated);
    if (playlist.length === 0) {
      onCurrentIndexChange(0);
      onPlayingChange(true);
    }
  };

  // Drag & drop files onto player
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Toggle fullscreen for this individual player
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
    }
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  // Unmute with Solo Audio
  const handleToggleMute = () => {
    if (isMuted) {
      // Unmuting: notify solo audio if present
      onMutedChange(false);
      onSoloAudioRequest?.(id);
    } else {
      onMutedChange(true);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`group relative h-full w-full overflow-hidden bg-black border-0 rounded-none transition-all ${
        isDraggingOver ? 'ring-2 ring-cyan-400 ring-inset' : ''
      }`}
    >
      {/* 1. Empty State Dropzone */}
      {playlist.length === 0 ? (
        <label className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black cursor-pointer group/drop hover:bg-white/[0.03] transition-colors border-0 rounded-none">
          <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-xl mb-2 text-white/50 group-hover/drop:scale-110 group-hover/drop:text-cyan-400 group-hover/drop:border-cyan-400/40 transition-all">
            +
          </div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400/80 uppercase mb-1">
            {label}
          </span>
          <p className="text-xs text-white/40">Click or drop video to play</p>
          <input
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </label>
      ) : (
        /* 2. Active Video Element with Pan Container */
        <div
          ref={scrollContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full relative select-none ${
            panDirection === 'x'
              ? 'overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
              : panDirection === 'y'
              ? 'overflow-y-auto overflow-x-hidden cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
              : 'overflow-hidden'
          }`}
        >
          <video
            ref={videoRef}
            src={activeUrl || undefined}
            preload="metadata"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              handleLoadedMetadata();
              setTimeout(centerPan, 60);
            }}
            onEnded={handleEnded}
            onClick={handleVideoClick}
            onDoubleClick={handleToggleFullscreen}
            className={`cursor-pointer select-none pointer-events-auto ${
              panDirection === 'x'
                ? 'h-full w-auto max-w-none min-w-full object-cover'
                : panDirection === 'y'
                ? 'w-full h-auto max-h-none min-h-full object-cover'
                : `h-full w-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`
            }`}
          />
        </div>
      )}

      {/* 3. Top Floating Status & Actions Bar */}
      {playlist.length > 0 && (
        <div
          className={`absolute top-0 inset-x-0 p-3 pt-18 sm:pt-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-3 transition-opacity duration-200 pointer-events-auto ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Left: Player Label & Current Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 font-mono text-[10px] font-bold shrink-0">
              {label}
            </span>
            <span
              className="text-xs font-medium text-white/80 truncate max-w-[140px] sm:max-w-[260px]"
              title={currentItem?.name}
            >
              {currentItem?.name || 'Untitled Video'}
            </span>
          </div>

          {/* Right: Pan Center, Aspect Fit & Playlist Drawer Trigger */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Center Pan Button */}
            {panDirection !== 'none' && (
              <button
                type="button"
                onClick={centerPan}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono transition-colors"
                title="Reset Pan to Center"
              >
                {panDirection === 'x' ? '↔ Center' : '↕ Center'}
              </button>
            )}

            {/* Fit mode toggle */}
            <button
              type="button"
              onClick={onFitModeToggle}
              className="px-2 py-1 rounded-lg bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 text-[10px] font-mono transition-colors"
              title={fitMode === 'cover' ? 'Fill screen (cropped)' : 'Fit video (no crop)'}
            >
              {fitMode === 'cover' ? 'Crop: Fill' : 'Fit: Original'}
            </button>

            {/* Playlist Drawer Button */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
              title="Open Playlist Drawer"
            >
              <span>📋</span>
              <span className="font-mono text-[11px]">
                {currentIndex + 1}/{playlist.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Bottom Controls Overlay */}
      {playlist.length > 0 && (
        <div
          className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-200 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Seekbar */}
          <div className="flex items-center gap-2 w-full">
            <span className="font-mono text-[10px] text-white/70 shrink-0 w-9 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="font-mono text-[10px] text-white/50 shrink-0 w-9">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Play/Pause & Nav */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevTrack}
                disabled={playlist.length <= 1}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center text-sm disabled:opacity-30 transition-colors"
                title="Previous video"
              >
                ⏮
              </button>

              <button
                type="button"
                onClick={() => onPlayingChange(!isPlaying)}
                className="w-9 h-9 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center text-base font-bold shadow-md shadow-cyan-400/20 active:scale-95 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                disabled={playlist.length <= 1}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center text-sm disabled:opacity-30 transition-colors"
                title="Next video"
              >
                ⏭
              </button>

              {/* Shuffle Toggle */}
              <button
                type="button"
                onClick={onShuffleToggle}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                  isShuffle
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title={isShuffle ? 'Shuffle is ON' : 'Shuffle is OFF'}
              >
                🔀
              </button>

              {/* Loop Toggle */}
              <button
                type="button"
                onClick={onLoopModeToggle}
                className={`px-2 h-8 rounded-lg flex items-center gap-1 text-[11px] font-mono transition-colors ${
                  loopMode !== 'off'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title={`Loop: ${loopMode.toUpperCase()}`}
              >
                <span>🔁</span>
                {loopMode === 'one' && <span className="text-[9px] font-bold">1</span>}
                {loopMode === 'all' && <span className="text-[9px] font-bold">ALL</span>}
              </button>
            </div>

            {/* Volume & Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Volume Slider & Mute */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center text-sm transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    onVolumeChange(newVol);
                    if (isMuted && newVol > 0) {
                      onMutedChange(false);
                      onSoloAudioRequest?.(id);
                    }
                  }}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 hidden sm:inline-block"
                  title="Volume"
                />
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center text-xs transition-colors"
                title="Fullscreen (F)"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Playlist Drawer */}
      <PlayerPlaylistDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        playlist={playlist}
        currentIndex={currentIndex}
        onSelectTrack={(idx) => {
          onCurrentIndexChange(idx);
          onPlayingChange(true);
        }}
        onRemoveTrack={(idx) => {
          const updated = playlist.filter((_, i) => i !== idx);
          onPlaylistChange(updated);
          if (currentIndex >= updated.length) {
            onCurrentIndexChange(Math.max(0, updated.length - 1));
          }
        }}
        onClearPlaylist={() => {
          onPlaylistChange([]);
          onCurrentIndexChange(0);
          onPlayingChange(false);
        }}
        onAddFiles={handleAddFiles}
        playerLabel={label}
      />
    </div>
  );
}
