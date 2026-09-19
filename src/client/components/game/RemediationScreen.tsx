import ClassicRound from './ClassicRound';
import MatchRound from './MatchRound';
import type { RemediationProgress, RoundData } from '../../hooks/useGameSession';

interface RemediationScreenProps {
  round: RoundData;
  isAnswered: boolean;
  selectedCharacterId: number | null;
  progress: RemediationProgress | null;
  onSelect: (characterId: number) => void;
  onFinishEarly: () => void;
}

export default function RemediationScreen({
  round,
  isAnswered,
  selectedCharacterId,
  progress,
  onSelect,
  onFinishEarly,
}: RemediationScreenProps) {
  return (
    <div className="w-full flex flex-col items-center gap-8">
      <div className="w-full max-w-4xl flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
            Remediation Protocol &mdash; Practice
          </span>
          {progress ? (
            <span className="text-xs font-mono text-white/60">
              {progress.masteredCount} of {progress.totalCount} mastered
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onFinishEarly}
          className="text-xs font-mono text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          Finish Drill →
        </button>
      </div>

      {round.mode === 'classic' ? (
        <ClassicRound
          imageUrl={round.imageUrl}
          options={round.options}
          correctCharacterId={round.correctCharacterId}
          isAnswered={isAnswered}
          selectedCharacterId={selectedCharacterId}
          onSelect={onSelect}
        />
      ) : (
        <MatchRound
          promptName={round.promptName}
          tiles={round.tiles}
          correctCharacterId={round.correctCharacterId}
          isAnswered={isAnswered}
          selectedCharacterId={selectedCharacterId}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
