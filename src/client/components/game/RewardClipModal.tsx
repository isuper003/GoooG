import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/apiClient';

interface RewardClipModalProps {
  characterName: string;
  initialCode: string;
  initialPool?: string[];
  onClose: () => void;
}

export default function RewardClipModal({
  characterName,
  initialCode,
  initialPool = [],
  onClose,
}: RewardClipModalProps) {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [pool, setPool] = useState<string[]>(() => {
    const list = initialPool.length > 0 ? initialPool : [initialCode];
    return Array.from(new Set(list));
  });
  const [isRolling, setIsRolling] = useState(false);

  const seenCodesRef = useRef<Set<string>>(new Set([initialCode.toLowerCase()]));

  // Handle Roll Again (fetches a verified-alive random clip from backend, with local pool fallback)
  const handleRollAgain = useCallback(async () => {
    if (isRolling) return;
    setIsRolling(true);

    try {
      const res = await apiClient.getRandomRewardClip(characterName, currentCode);
      if (res.ok && res.code && res.code.toLowerCase() !== currentCode.toLowerCase()) {
        seenCodesRef.current.add(res.code.toLowerCase());
        setCurrentCode(res.code);
        if (res.pool && res.pool.length > 0) {
          setPool((prev) => Array.from(new Set([...prev, ...(res.pool || [])])));
        }
        setIsRolling(false);
        return;
      }
    } catch (err) {
      console.warn('[RewardClipModal] Server roll failed, trying local pool fallback', err);
    }

    // Local pool fallback if server is unreachable or returned same code
    const alternatives = pool.filter(
      (c) => c.toLowerCase() !== currentCode.toLowerCase() && !seenCodesRef.current.has(c.toLowerCase())
    );
    const candidate =
      alternatives.length > 0
        ? alternatives[Math.floor(Math.random() * alternatives.length)]
        : pool.find((c) => c.toLowerCase() !== currentCode.toLowerCase());

    if (candidate) {
      seenCodesRef.current.add(candidate.toLowerCase());
      setCurrentCode(candidate);
    }

    setIsRolling(false);
  }, [characterName, currentCode, isRolling, pool]);

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
            {/* Continuous Loop Badge */}
            <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
              <span className="text-emerald-400">🔁</span>
              <span>Looping</span>
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

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-5 bg-black/40">
          {/* Roll Again Button */}
          <button
            type="button"
            onClick={handleRollAgain}
            disabled={isRolling}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
