import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useGameSession, type GameMode } from '../hooks/useGameSession';
import type { GameSessionPoolCharacter } from '../../shared/types';
import ClassicRound from '../components/game/ClassicRound';
import MatchRound from '../components/game/MatchRound';
import ResultsScreen from '../components/game/ResultsScreen';
import RemediationScreen from '../components/game/RemediationScreen';
import SessionCompleteScreen from '../components/game/SessionCompleteScreen';

interface GameLocationState {
  sessionId: number;
  pool: GameSessionPoolCharacter[];
  mode: GameMode;
  plannedRounds: number | null;
  scope: string;
}

function isGameLocationState(state: unknown): state is GameLocationState {
  return (
    !!state &&
    typeof state === 'object' &&
    'sessionId' in state &&
    'pool' in state &&
    'mode' in state
  );
}

export default function GamePage() {
  const location = useLocation();

  if (!isGameLocationState(location.state)) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-16">
        <h1 className="text-2xl font-bold text-fg">No active game</h1>
        <p className="text-fg-muted max-w-sm">
          Looks like there's no game in progress. Head back home and pick a category to start
          playing.
        </p>
        <Link
          to="/"
          className="rounded-button bg-category-trans px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return <ActiveGame state={location.state} />;
}

function ActiveGame({ state }: { state: GameLocationState }) {
  const game = useGameSession({
    sessionId: state.sessionId,
    pool: state.pool,
    mode: state.mode,
    plannedRounds: state.plannedRounds,
  });
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const isMainPhase = game.status === 'playing' || game.status === 'feedback';
  const isRemediationPhase =
    game.status === 'remediationPlaying' || game.status === 'remediationFeedback';

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <AnimatePresence mode="wait">
        {isMainPhase && game.currentRound && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <div className="w-full max-w-3xl flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">
                {game.plannedRounds === null
                  ? `Round ${game.roundNumber}`
                  : `Round ${game.roundNumber} of ${game.plannedRounds}`}
              </span>
              {confirmingEnd ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-fg-muted">End session?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingEnd(false);
                      game.endSessionEarly();
                    }}
                    className="font-semibold text-rose-400 hover:text-rose-300"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingEnd(false)}
                    className="text-fg-muted hover:text-fg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingEnd(true)}
                  className="text-sm font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  End session
                </button>
              )}
            </div>

            {game.currentRound.mode === 'classic' ? (
              <ClassicRound
                imageUrl={game.currentRound.imageUrl}
                options={game.currentRound.options}
                correctCharacterId={game.currentRound.correctCharacterId}
                isAnswered={game.status === 'feedback'}
                selectedCharacterId={game.selectedCharacterId}
                onSelect={game.submitAnswer}
              />
            ) : (
              <MatchRound
                promptName={game.currentRound.promptName}
                tiles={game.currentRound.tiles}
                correctCharacterId={game.currentRound.correctCharacterId}
                isAnswered={game.status === 'feedback'}
                selectedCharacterId={game.selectedCharacterId}
                onSelect={game.submitAnswer}
              />
            )}
          </motion.div>
        )}

        {game.status === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <ResultsScreen
              missedCharacters={game.missedCharacters}
              onPractice={game.startRemediation}
              onSkip={game.skipRemediation}
            />
          </motion.div>
        )}

        {isRemediationPhase && game.currentRound && (
          <motion.div key="remediation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <RemediationScreen
              round={game.currentRound}
              isAnswered={game.status === 'remediationFeedback'}
              selectedCharacterId={game.selectedCharacterId}
              progress={game.remediationProgress}
              onSelect={game.submitAnswer}
              onFinishEarly={game.finishRemediationEarly}
            />
          </motion.div>
        )}

        {game.status === 'complete' && game.finalSummary && (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <SessionCompleteScreen summary={game.finalSummary} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
