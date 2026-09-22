import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useImportWatchLater } from '../../hooks/useData18WatchLater';
import type { Data18WatchLaterBackup, Data18WatchLaterBackupItem } from '../../../shared/data18Types';

interface WatchLaterImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WatchLaterImportModal({ onClose, onSuccess }: WatchLaterImportModalProps) {
  const [fileContent, setFileContent] = useState<Data18WatchLaterBackupItem[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportWatchLater();

  const handleProcessJson = (text: string, name: string) => {
    setError(null);
    try {
      const parsed = JSON.parse(text) as Data18WatchLaterBackup | Data18WatchLaterBackupItem[];
      let items: Data18WatchLaterBackupItem[] = [];

      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Data18WatchLaterBackup).items)) {
        items = (parsed as Data18WatchLaterBackup).items;
      } else {
        throw new Error('Invalid format. File must contain an items array.');
      }

      if (items.length === 0) {
        throw new Error('Backup file contains 0 items.');
      }

      // Quick sanity check on first item
      const sample = items[0];
      if (!sample || !sample.itemType || !sample.itemId || !sample.title) {
        throw new Error('Items are missing required fields (itemType, itemId, or title).');
      }

      setFileContent(items);
      setFileName(name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not parse JSON file.');
      setFileContent(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessJson(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessJson(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!fileContent || fileContent.length === 0) return;
    try {
      await importMutation.mutateAsync({
        mode,
        items: fileContent,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  // Preview stats
  const scenesCount = fileContent?.filter((i) => i.itemType === 'scene').length ?? 0;
  const moviesCount = fileContent?.filter((i) => i.itemType === 'movie').length ?? 0;
  const watchedCount = fileContent?.filter((i) => i.isWatched).length ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b111e] shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              📥
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">Import Watch Later Backup</h3>
              <p className="text-[11px] text-white/50">Restore your saved scenes and movies from a JSON file.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-500/10'
                : fileContent
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-3xl">{fileContent ? '📄' : '📁'}</span>
            <div className="text-xs">
              {fileName ? (
                <span className="font-semibold text-emerald-400 font-mono">{fileName}</span>
              ) : (
                <>
                  <span className="font-bold text-white">Click to select backup file</span>
                  <span className="text-white/40"> or drag and drop (.json)</span>
                </>
              )}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
              ⚠️ {error}
            </div>
          )}

          {/* Preview Details */}
          {fileContent && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-white/80 border-b border-white/10 pb-2">
                <span>File Summary:</span>
                <span className="font-mono text-cyan-300 font-bold">{fileContent.length} Total Items</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                  <div className="font-mono font-bold text-white">{scenesCount}</div>
                  <div className="text-[10px] text-white/40">Scenes 🎬</div>
                </div>
                <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                  <div className="font-mono font-bold text-white">{moviesCount}</div>
                  <div className="text-[10px] text-white/40">Movies 📼</div>
                </div>
                <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                  <div className="font-mono font-bold text-emerald-400">{watchedCount}</div>
                  <div className="text-[10px] text-white/40">Watched ✓</div>
                </div>
              </div>

              {/* Import Strategy */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Import Strategy:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex flex-col gap-1 rounded-xl border p-2.5 cursor-pointer transition-all ${
                      mode === 'merge'
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <input
                        type="radio"
                        name="import-mode"
                        checked={mode === 'merge'}
                        onChange={() => setMode('merge')}
                        className="accent-cyan-400"
                      />
                      <span>Merge (دمج)</span>
                    </div>
                    <span className="text-[10px] text-white/50 leading-tight">
                      Add new items and update details without deleting existing list.
                    </span>
                  </label>

                  <label
                    className={`flex flex-col gap-1 rounded-xl border p-2.5 cursor-pointer transition-all ${
                      mode === 'replace'
                        ? 'border-amber-400 bg-amber-500/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <input
                        type="radio"
                        name="import-mode"
                        checked={mode === 'replace'}
                        onChange={() => setMode('replace')}
                        className="accent-amber-400"
                      />
                      <span>Replace (استبدال)</span>
                    </div>
                    <span className="text-[10px] text-white/50 leading-tight">
                      Wipe current list and replace completely with this backup.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5 bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!fileContent || fileContent.length === 0 || importMutation.isPending}
            className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-1.5 text-xs font-bold shadow-lg shadow-cyan-400/20 transition-all cursor-pointer disabled:opacity-40 active:scale-95 flex items-center gap-1.5"
          >
            <span>{importMutation.isPending ? 'Importing...' : 'Confirm Import'}</span>
            <span>❯</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
