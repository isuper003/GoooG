import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { apiClient, ApiError } from '../../lib/apiClient';
import type { GameMode } from '../../hooks/useGameSession';

interface GameSetupModalProps {
  scope: 'trans' | 'sluts' | 'twinks' | 'mix';
  scopeLabel: string;
  onClose: () => void;
}

const ROUND_OPTIONS: { label: string; value: number | null }[] = [
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '∞ Endless', value: null },
];

export default function GameSetupModal({ scope, scopeLabel, onClose }: GameSetupModalProps) {
  const navigate = useNavigate();
  const [plannedRounds, setPlannedRounds] = useState<number | null>(10);
  const [mode, setMode] = useState<GameMode>('classic');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  async function handleStart() {
    setError(null);
    setIsStarting(true);
    try {
      const response = await apiClient.createGameSession({ scope, mode, plannedRounds });
      navigate('/play', {
        state: {
          sessionId: response.sessionId,
          pool: response.pool,
          mode,
          plannedRounds,
          scope,
          focusIds: response.focusIds ?? null,
          confusion: response.confusion ?? null,
          latencyBaseline: response.latencyBaseline ?? null,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const body = err.body as { need?: number; have?: number } | null;
        setError(
          `${mode === 'classic' ? 'Classic' : 'Match'} mode requires at least ${body?.need ?? 'several'} characters in ${scopeLabel} (currently ${body?.have ?? 0}). Add more via Photo Studio.`
        );
      } else {
        setError('Failed to initiate arena session. Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xl px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl bg-[#090d14]/95 border border-white/10 p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-2 border-b border-white/[0.08]">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Arena Investigation Chamber
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                {scopeLabel} &mdash; Setup
              </h2>
              <p className="text-xs text-white/50 mt-1">
                Configure investigation protocol and round targets.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1 text-lg font-mono leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Mode Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
              Investigation Protocol (Mode)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('classic')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'classic'
                    ? 'border-cyan-400/80 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-white text-sm">Classic Portrait</div>
                  {mode === 'classic' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  )}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  1 centerpiece portrait &rarr; 4 performer names
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('match')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'match'
                    ? 'border-cyan-400/80 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-white text-sm">Visual Match</div>
                  {mode === 'match' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  )}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  1 target name &rarr; 4 candidate portraits
                </div>
              </button>
            </div>
          </div>

          {/* Rounds Target */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
              Round Limit Target
            </span>
            <div className="grid grid-cols-5 gap-2">
              {ROUND_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPlannedRounds(opt.value)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-mono font-semibold transition-all text-center cursor-pointer border ${
                    plannedRounds === opt.value
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-sm shadow-cyan-400/20'
                      : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 font-mono">
              {error}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white font-mono text-xs border border-white/10 transition-colors cursor-pointer"
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className="flex-[2] py-3 px-4 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs tracking-wide transition-all shadow-xl shadow-cyan-400/20 disabled:opacity-50 cursor-pointer"
            >
              {isStarting ? 'Initiating Arena...' : 'Engage Session →'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
