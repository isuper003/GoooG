import type { SessionPreset } from '../../hooks/usePresetSession';
import { usePresetSession } from '../../hooks/usePresetSession';
import { useReviewQueues } from '../../hooks/useReview';

interface TodayTasksBarProps {
  className?: string;
}

interface TaskItem {
  preset: SessionPreset;
  label: string;
  icon: string;
  count: number;
}

export default function TodayTasksBar({ className }: TodayTasksBarProps) {
  const { data: queues } = useReviewQueues();
  const { startPresetSession, isStarting, startError, startingPreset } = usePresetSession();

  const dueCount = queues?.due?.count ?? 0;
  const leechCount = queues?.leech?.count ?? 0;
  const quickCount = queues?.quick?.count ?? 0;

  if (!queues || (dueCount === 0 && leechCount === 0 && quickCount === 0)) {
    return null;
  }

  const tasks: TaskItem[] = [
    { preset: 'due', label: 'Due Review', icon: '⏳', count: dueCount },
    { preset: 'leech', label: 'Rescue', icon: '🩺', count: leechCount },
    { preset: 'quick_mix', label: 'Quick Mix', icon: '🌙', count: quickCount },
  ];

  return (
    <section className={`flex flex-col gap-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2 font-mono text-xs text-white/60 uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>Today &mdash; Spaced Repetition</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tasks.map((task) => {
          const isCurrentStarting = startingPreset === task.preset;
          const isDisabled = isStarting || task.count === 0;

          return (
            <button
              key={task.preset}
              type="button"
              disabled={isDisabled}
              onClick={() => startPresetSession(task.preset, task.count)}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all text-left ${
                task.count === 0
                  ? 'border-white/5 bg-white/[0.02] text-white/40 cursor-not-allowed opacity-50'
                  : isStarting
                    ? 'border-white/10 bg-white/[0.04] text-white/60 cursor-not-allowed'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white cursor-pointer active:scale-95'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{task.icon}</span>
                <span className="font-display font-bold text-sm tracking-tight text-white">
                  {task.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isCurrentStarting ? (
                  <span className="inline-block animate-spin text-cyan-400 font-mono text-sm leading-none">
                    ⟳
                  </span>
                ) : (
                  <span
                    className={`font-mono text-xs px-2.5 py-0.5 rounded-full border leading-none ${
                      task.count > 0
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-bold'
                        : 'bg-white/5 text-white/30 border-white/10'
                    }`}
                  >
                    {task.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {startError && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 font-mono">
          {startError}
        </div>
      )}
    </section>
  );
}
