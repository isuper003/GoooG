import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../lib/apiClient';

export type SessionPreset = 'due' | 'leech' | 'critical' | 'quick_mix';

export function usePresetSession(): {
  startPresetSession: (preset: SessionPreset, queueLength: number) => Promise<void>;
  isStarting: boolean;
  startError: string | null;
  startingPreset: SessionPreset | null;
} {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startingPreset, setStartingPreset] = useState<SessionPreset | null>(null);

  async function startPresetSession(preset: SessionPreset, queueLength: number): Promise<void> {
    setIsStarting(true);
    setStartingPreset(preset);
    setStartError(null);

    const plannedRounds = Math.min(Math.max(queueLength, 1), 20);
    const mode = 'classic' as const;
    const scope = 'mix' as const;

    try {
      const response = await apiClient.createGameSession({
        mode,
        preset,
        plannedRounds,
        scope,
      });

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
          drill: preset === 'leech' ? { masteryTarget: 3 } : null,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setStartError('No characters are currently waiting in this review queue.');
      } else {
        setStartError('Failed to initiate review session. Please try again.');
      }
    } finally {
      setIsStarting(false);
      setStartingPreset(null);
    }
  }

  return {
    startPresetSession,
    isStarting,
    startError,
    startingPreset,
  };
}
