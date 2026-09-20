import { useFullscreen } from '../../hooks/useFullscreen';

export interface FullscreenButtonProps {
  /** Visual variant: 'header' (default compact icon), 'pill' (icon + text), or 'icon' */
  variant?: 'header' | 'pill' | 'icon';
  /** Custom class names to append */
  className?: string;
  /** Whether to show keyboard shortcut hint in tooltip */
  showShortcutHint?: boolean;
}

export default function FullscreenButton({
  variant = 'header',
  className = '',
  showShortcutHint = true,
}: FullscreenButtonProps) {
  const { isFullscreen, toggleFullscreen, isPseudo } = useFullscreen();

  const title = isFullscreen
    ? `Exit Fullscreen${showShortcutHint ? ' (Esc / F)' : ''}`
    : `Enter Fullscreen${showShortcutHint ? ' (F)' : ''}`;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleFullscreen}
        title={title}
        aria-label={title}
        className={`group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs font-medium transition-all duration-200 border cursor-pointer select-none active:scale-95 ${
          isFullscreen
            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
            : 'bg-black/50 hover:bg-white/10 text-white/80 hover:text-white border-white/15 hover:border-white/30 backdrop-blur-md'
        } ${className}`}
      >
        {isFullscreen ? <ExitFullscreenIcon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" /> : <EnterFullscreenIcon className="w-3.5 h-3.5 text-white/70 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />}
        <span className="tracking-wider uppercase text-[10px] sm:text-[11px]">
          {isFullscreen ? 'Exit Full' : 'Full Screen'}
        </span>
        {isPseudo && isFullscreen && (
          <span className="text-[9px] px-1 rounded bg-cyan-400/20 text-cyan-300 uppercase">
            Fit
          </span>
        )}
      </button>
    );
  }

  // Header / Icon variant: Touch-friendly (at least 38x38px)
  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      title={title}
      aria-label={title}
      className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg border transition-all duration-200 cursor-pointer select-none active:scale-95 ${
        isFullscreen
          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
          : 'bg-white/[0.04] hover:bg-white/[0.1] text-white/70 hover:text-white border-white/[0.1] hover:border-white/20'
      } ${className}`}
    >
      {isFullscreen ? (
        <ExitFullscreenIcon className="w-4 h-4 text-cyan-400 animate-in fade-in zoom-in-75 duration-150" />
      ) : (
        <EnterFullscreenIcon className="w-4 h-4 text-white/80 hover:text-white duration-150" />
      )}
      {/* Subtle indicator dot when active */}
      {isFullscreen && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
      )}
    </button>
  );
}

/**
 * Expand / Enter Fullscreen Icon (4 outward pointing corners)
 */
function EnterFullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Top Left */}
      <path d="M4 9V4h5" />
      {/* Top Right */}
      <path d="M20 9V4h-5" />
      {/* Bottom Left */}
      <path d="M4 15v5h5" />
      {/* Bottom Right */}
      <path d="M20 15v5h-5" />
    </svg>
  );
}

/**
 * Compress / Exit Fullscreen Icon (4 inward pointing corners)
 */
function ExitFullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Top Left */}
      <path d="M9 4v5H4" />
      {/* Top Right */}
      <path d="M15 4v5h5" />
      {/* Bottom Left */}
      <path d="M9 20v-5H4" />
      {/* Bottom Right */}
      <path d="M15 20v-5h5" />
    </svg>
  );
}
