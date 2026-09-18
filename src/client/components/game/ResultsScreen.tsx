import type { MissedCharacter } from '../../hooks/useGameSession';

interface ResultsScreenProps {
  missedCharacters: MissedCharacter[];
  onPractice: () => void;
  onSkip: () => void;
}

export default function ResultsScreen({
  missedCharacters,
  onPractice,
  onSkip,
}: ResultsScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          {missedCharacters.length} open {missedCharacters.length === 1 ? 'case' : 'cases'}
        </span>
        <h2 className="font-display text-2xl font-semibold text-fg mt-1">Let's review what you missed</h2>
        <p className="text-fg-muted mt-1">Practice them now to lock them in.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {missedCharacters.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center gap-2 card-notch bg-bg-card p-3 border-2 border-bg-hover"
          >
            <div className="w-full aspect-square overflow-hidden bg-bg-muted">
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <span className="text-sm font-medium text-fg text-center">{c.name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onPractice}
          className="flex-1 rounded-button bg-accent px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Practice missed characters
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-button bg-bg-muted px-4 py-3 font-medium text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg"
        >
          Finish without practicing
        </button>
      </div>
    </div>
  );
}
