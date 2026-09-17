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
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-fg-dim font-semibold">
            Practice round
          </span>
          {progress ? (
            <span className="text-sm text-fg-muted">
              {progress.masteredCount} of {progress.totalCount} mastered
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onFinishEarly}
          className="text-sm font-medium text-fg-muted hover:text-fg transition-colors"
        >
          Finish anyway
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
