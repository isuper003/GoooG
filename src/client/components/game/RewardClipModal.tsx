import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/apiClient';

interface RewardClipModalProps {
  characterName: string;
  initialCode: string;
  initialPool?: string[];
  durationSeconds?: number;
  onClose: () => void;
}

export default function RewardClipModal({
  characterName,
  initialCode,
  initialPool = [],
  durationSeconds = 10,
  onClose,
}: RewardClipModalProps) {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [pool, setPool] = useState<string[]>(() => {
    const list = initialPool.length > 0 ? initialPool : [initialCode];
    return Array.from(new Set(list));
  });
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isRolling, setIsRolling] = useState(false);

  const seenCodesRef = useRef<Set<string>>(new Set([initialCode.toLowerCase()]));

  // Handle Roll Again
  const handleRollAgain = useCallback(async () => {
    setIsRolling(true);

    // 1. Try to find a candidate from the local pool that hasn't been seen recently
    const unseenCandidates = pool.filter(
      (c) => c.toLowerCase() !== currentCode.toLowerCase() && !seenCodesRef.current.has(c.toLowerCase())
    );

    let nextCode: string | null = null;

    if (unseenCandidates.length > 0) {
      nextCode = unseenCandidates[Math.floor(Math.random() * unseenCandidates.length)];
    } else {
      // If all seen, pick any other code in the pool
      const otherCandidates = pool.filter((c) => c.toLowerCase() !== currentCode.toLowerCase());
      if (otherCandidates.length > 0) {
        nextCode = otherCandidates[Math.floor(Math.random() * otherCandidates.length)];
      }
    }

    if (nextCode) {
      seenCodesRef.current.add(nextCode.toLowerCase());
      setCurrentCode(nextCode);
      setTimeLeft(durationSeconds);
      setIsRolling(false);
      return;
    }

    // 2. If pool has no alternatives, fetch live from server
    try {
      const res = await apiClient.getRandomRewardClip(characterName, currentCode);
      if (res.ok && res.code) {
        setCurrentCode(res.code);
        seenCodesRef.current.add(res.code.toLowerCase());
        if (res.pool && res.pool.length > 0) {
          setPool((prev) => Array.from(new Set([...prev, ...(res.pool || [])])));
        }
        setTimeLeft(durationSeconds);
      }
    } catch (err) {
      console.warn('[RewardClipModal] Failed to roll new clip', err);
    } finally {
      setIsRolling(false);
    }
  }, [characterName, currentCode, durationSeconds, pool]);

  // 100ms precision countdown timer
  useEffect(() => {
    const intervalMs = 100;
    const decrement = intervalMs / 1000;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [onClose, currentCode]);

  // Lock body scroll and listen for key shortcuts (Space, Enter, Esc to advance, R to roll again)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void handleRollAgain();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleRollAgain]);

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b111e] shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
              <span>✓</span>
              <span>Correct!</span>
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-[320px]">
              {characterName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Seconds Badge */}
            <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-xs font-semibold text-white/80">
              ⏱️ {Math.ceil(timeLeft)}s
            </span>

            {/* Skip Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-semibold text-white transition-colors cursor-pointer active:scale-95"
              title="Skip to next round (Space)"
            >
              <span>Next</span>
              <span>❯</span>
            </button>
          </div>
        </div>

        {/* Video Embed Player */}
        <div className="relative aspect-video w-full bg-black overflow-hidden">
          <iframe
            key={currentCode}
            src={`https://redgifs.com/ifr/${currentCode}?autoplay=1&muted=1`}
            title={`Preview clip of ${characterName}`}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>

        {/* Progress Bar (10s countdown) */}
        <div className="h-1.5 w-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-5 bg-black/40">
          {/* Roll Again Button */}
          <button
            type="button"
            onClick={handleRollAgain}
            disabled={isRolling}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all cursor-pointer active:scale-95"
            title="Show a different clip for this character (Keyboard: R)"
          >
            <span className={isRolling ? 'animate-spin' : ''}>🎲</span>
            <span>{isRolling ? 'Rolling...' : 'Roll Again'}</span>
          </button>

          {/* Skip / Next Round Action */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 px-4 py-1.5 text-xs font-bold text-black transition-all cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95"
          >
            <span>Next Round</span>
            <span className="hidden sm:inline text-[10px] opacity-70">(Space)</span>
            <span>❯</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
