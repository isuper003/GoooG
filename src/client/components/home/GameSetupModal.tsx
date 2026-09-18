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
  { label: '15', value: 15 },
  { label: '25', value: 25 },
  { label: '∞', value: null },
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
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const body = err.body as { need?: number; have?: number } | null;
        setError(
          `${mode === 'classic' ? 'Classic' : 'Match'} mode needs at least ${body?.need ?? 'a few more'} characters in ${scopeLabel} — you have ${body?.have ?? 0}. Add more in Smart Import.`
        );
      } else {
        setError('Something went wrong starting the game. Please try again.');
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-card bg-bg-card border border-bg-hover p-6 flex flex-col gap-6"
        >
          <div>
            <h2 className="text-xl font-bold text-fg">Play &mdash; {scopeLabel}</h2>
            <p className="text-sm text-fg-muted mt-1">Set up your round.</p>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-fg-dim mb-2">
              Rounds
            </span>
            <div className="flex gap-2 flex-wrap">
              {ROUND_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPlannedRounds(opt.value)}
                  className={`rounded-button px-4 py-2 text-sm font-semibold transition-colors ${
                    plannedRounds === opt.value
                      ? 'bg-category-trans text-white'
                      : 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-fg-dim mb-2">
              Mode
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('classic')}
                className={`rounded-button border px-4 py-3 text-left transition-colors ${
                  mode === 'classic'
                    ? 'border-category-trans bg-category-trans/10'
                    : 'border-bg-hover bg-bg-muted hover:bg-bg-hover'
                }`}
              >
                <div className="font-semibold text-fg">Classic</div>
                <div className="text-xs text-fg-muted mt-0.5">Image, pick the name</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('match')}
                className={`rounded-button border px-4 py-3 text-left transition-colors ${
                  mode === 'match'
                    ? 'border-category-trans bg-category-trans/10'
                    : 'border-bg-hover bg-bg-muted hover:bg-bg-hover'
                }`}
              >
                <div className="font-semibold text-fg">Match</div>
                <div className="text-xs text-fg-muted mt-0.5">Name, pick the image</div>
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-button bg-bg-muted px-4 py-2.5 font-medium text-fg-muted hover:bg-bg-hover hover:text-fg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className="flex-1 rounded-button bg-category-trans px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isStarting ? 'Starting...' : 'Start'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
