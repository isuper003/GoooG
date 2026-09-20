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
import FullscreenButton from '../components/ui/FullscreenButton';

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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 py-16">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 font-mono text-xl mb-2">
          ⚔
        </div>
        <h1 className="font-display text-3xl font-bold text-white tracking-tight">
          No Active Arena Session
        </h1>
        <p className="text-white/50 max-w-sm text-xs leading-relaxed">
          Select a performer from the Spotlight or launch an archive deck to engage the investigation chamber.
        </p>
        <Link
          to="/"
          className="mt-2 px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-400/20"
        >
          Return to Spotlight →
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
    <div className="flex flex-col items-center gap-6 py-2 w-full">
      <AnimatePresence mode="wait">
        {isMainPhase && game.currentRound && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center gap-6"
          >
            {/* Arena Top Status Bar */}
            <div className="w-full max-w-4xl flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Round</span>
                <span className="text-lg font-display font-bold text-white">
                  {game.roundNumber}{' '}
                  <span className="text-white/30 text-sm font-normal">
                    / {game.plannedRounds ?? '∞'}
                  </span>
                </span>
                <span className="text-white/20">|</span>
                <span className="text-xs font-mono text-cyan-400 font-semibold uppercase">
                  {game.currentRound.mode === 'classic' ? 'Classic' : 'Match'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <FullscreenButton variant="header" />
                {confirmingEnd ? (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-white/60">Abort?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingEnd(false);
                        game.endSessionEarly();
                      }}
                      className="font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingEnd(false)}
                      className="text-white/40 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingEnd(true)}
                    className="text-xs font-mono text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Abort Session
                  </button>
                )}
              </div>
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
