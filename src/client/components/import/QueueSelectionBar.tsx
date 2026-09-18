interface QueueSelectionBarProps {
  total: number;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (selected: boolean) => void;
}

export default function QueueSelectionBar({
  total,
  selectedCount,
  allSelected,
  someSelected,
  onToggleAll,
}: QueueSelectionBarProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
        Selection ({selectedCount}/{total})
      </label>
      <div className="flex items-center gap-2.5 bg-bg-muted rounded-button border border-bg-hover px-2.5 py-1.5 h-[38px]">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-fg select-none">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={(e) => onToggleAll(e.target.checked)}
            className="w-4 h-4 rounded border-bg-hover accent-accent cursor-pointer"
            title="Toggle all"
          />
          <span>All</span>
        </label>
        <div className="h-4 w-px bg-bg-hover" />
        <button
          type="button"
          onClick={() => onToggleAll(true)}
          className={`text-xs font-semibold transition-colors ${
            allSelected ? 'text-accent' : 'text-fg-muted hover:text-fg'
          }`}
        >
          Select All
        </button>
        <button
          type="button"
          onClick={() => onToggleAll(false)}
          className={`text-xs font-semibold transition-colors ${
            !someSelected ? 'text-rose-400' : 'text-fg-muted hover:text-fg'
          }`}
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}
