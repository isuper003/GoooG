import { useState, useRef } from 'react';
import {
  useFullBackupSummary,
  useImportFullBackup,
  downloadFullAppBackup,
} from '../../hooks/useBackup';
import type { FullAppBackup, FullBackupImportResponse } from '../../../shared/backupTypes';

export default function BackupRestoreSection() {
  const { data: summary, isLoading: summaryLoading } = useFullBackupSummary();
  const importMutation = useImportFullBackup();

  const [isExporting, setIsExporting] = useState(false);
  const [fileContent, setFileContent] = useState<FullAppBackup | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState<FullBackupImportResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadFullAppBackup();
    } catch (err: unknown) {
      console.error('Export failed', err);
      alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleProcessJson = (text: string, name: string) => {
    setError(null);
    setImportResult(null);
    try {
      const parsed = JSON.parse(text) as FullAppBackup;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format.');
      }

      if (parsed.version !== 1 || !parsed.data) {
        throw new Error('Unrecognized backup format. Must be a valid GoooG full backup file (version 1).');
      }

      if (!parsed.data.characters && !parsed.data.gameSessions && !parsed.data.data18Favorites) {
        throw new Error('Backup file contains no usable data sections.');
      }

      setFileContent(parsed);
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
    if (!fileContent) return;
    setError(null);
    setImportResult(null);

    if (mode === 'replace') {
      const confirmed = window.confirm(
        'WARNING: "Replace" mode will delete your current characters, game stats, and followed items, replacing them completely with this backup.\n\nAre you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    try {
      const res = await importMutation.mutateAsync({
        mode,
        backup: fileContent,
      });
      setImportResult(res);
      setFileContent(null);
      setFileName(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Live System Data Summary Banner */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c121d] via-[#090e17] to-[#05080e] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl border border-cyan-500/30 text-cyan-300 shadow-md">
              📦
            </div>
            <div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                Central Vault &amp; Disaster Recovery
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                Full Database Backup &amp; Restore
              </h2>
              <p className="text-xs text-white/50 mt-1 max-w-xl">
                Export and import 100% of your data: characters, recognition telemetry, SRS levels, game sessions,
                Data18 followed performers/studios, and watch later items.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || summaryLoading}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-6 py-3 font-display text-sm font-bold text-black shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <span>{isExporting ? '⏳' : '📥'}</span>
            <span>{isExporting ? 'Generating Backup...' : 'Export Full Backup'}</span>
          </button>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 text-center">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="text-[10px] font-mono text-white/40 uppercase">Characters 👤</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white">
              {summaryLoading ? '…' : summary?.charactersCount ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="text-[10px] font-mono text-white/40 uppercase">Labels 🏷️</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white/90">
              {summaryLoading ? '…' : summary?.labelsCount ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5">
            <div className="text-[10px] font-mono text-cyan-300/60 uppercase">Game Sessions 🎮</div>
            <div className="mt-1 font-mono text-2xl font-bold text-cyan-300">
              {summaryLoading ? '…' : summary?.gameSessionsCount ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3.5">
            <div className="text-[10px] font-mono text-violet-300/60 uppercase">Data18 Following 💜</div>
            <div className="mt-1 font-mono text-2xl font-bold text-violet-300">
              {summaryLoading ? '…' : summary?.data18FavoritesCount ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-amber-300/60 uppercase">Watch Later 🕒</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-300">
              {summaryLoading ? '…' : summary?.data18WatchLaterCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Export Card & Import Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Export Details */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#090d14] p-6 sm:p-7 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                📤
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">Full Backup Export</h3>
                <p className="text-xs text-white/50">Download your entire vault as an open JSON archive.</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>
                  <strong>Independent &amp; Portable:</strong> Uses natural performer names and labels, avoiding ID
                  collisions across devices.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>
                  <strong>Full Learning Telemetry:</strong> Preserves Leitner boxes, SRS memory levels (0–5), leech
                  indicators, response times, and confusion matrices.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>
                  <strong>Data18 Ecosystem:</strong> Bundles your followed actors/studios and complete Watch Later queue.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-mono text-white/40">File format: .json (GoooG v1)</span>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <span>{isExporting ? '⏳' : '📥'}</span>
              <span>{isExporting ? 'Exporting...' : 'Download Backup'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Import & Restore Studio */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#090d14] p-6 sm:p-7 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                📥
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">Full Backup Restore</h3>
                <p className="text-xs text-white/50">Restore or merge a previously exported GoooG JSON backup.</p>
              </div>
            </div>

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
                    <span className="font-bold text-white">Select full backup file</span>
                    <span className="text-white/40"> or drag and drop (.json)</span>
                  </>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                ⚠️ {error}
              </div>
            )}

            {/* Success Message */}
            {importResult && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 space-y-2 text-xs text-emerald-200 animate-in fade-in">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>✓</span>
                  <span>Backup restored successfully in {importResult.mode} mode!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 text-[11px] font-mono">
                  <div>👤 Characters: {importResult.imported.characters}</div>
                  <div>🏷️ Labels: {importResult.imported.labels}</div>
                  <div>🎮 Sessions: {importResult.imported.gameSessions}</div>
                  <div>💜 Following: {importResult.imported.data18Favorites}</div>
                  <div>🕒 Watch Later: {importResult.imported.data18WatchLater}</div>
                </div>
              </div>
            )}

            {/* File Preview Details */}
            {fileContent && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-white/80 border-b border-white/10 pb-2">
                  <span>Detected Contents:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    Exported {fileContent.exportedAt?.split('T')[0]}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                    <div className="font-mono font-bold text-white">
                      {fileContent.data.characters?.length ?? 0}
                    </div>
                    <div className="text-[9px] text-white/40">Chars 👤</div>
                  </div>
                  <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                    <div className="font-mono font-bold text-white">{fileContent.data.labels?.length ?? 0}</div>
                    <div className="text-[9px] text-white/40">Labels 🏷️</div>
                  </div>
                  <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                    <div className="font-mono font-bold text-cyan-300">
                      {fileContent.data.gameSessions?.length ?? 0}
                    </div>
                    <div className="text-[9px] text-white/40">Sessions 🎮</div>
                  </div>
                  <div className="rounded-xl bg-black/40 p-2 border border-white/5">
                    <div className="font-mono font-bold text-violet-300">
                      {fileContent.data.data18Favorites?.length ?? 0}
                    </div>
                    <div className="text-[9px] text-white/40">Follow 💜</div>
                  </div>
                  <div className="rounded-xl bg-black/40 p-2 border border-white/5 col-span-2 sm:col-span-1">
                    <div className="font-mono font-bold text-amber-300">
                      {fileContent.data.data18WatchLater?.length ?? 0}
                    </div>
                    <div className="text-[9px] text-white/40">Later 🕒</div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="pt-2 space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                    Restore Mode:
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
                          name="full-import-mode"
                          checked={mode === 'merge'}
                          onChange={() => setMode('merge')}
                          className="accent-cyan-400"
                        />
                        <span>Merge (دمج ذكي)</span>
                      </div>
                      <span className="text-[10px] text-white/50 leading-tight">
                        Keep existing data and merge in new characters, sessions, and favorites.
                      </span>
                    </label>

                    <label
                      className={`flex flex-col gap-1 rounded-xl border p-2.5 cursor-pointer transition-all ${
                        mode === 'replace'
                          ? 'border-amber-400 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <input
                          type="radio"
                          name="full-import-mode"
                          checked={mode === 'replace'}
                          onChange={() => setMode('replace')}
                          className="accent-amber-400"
                        />
                        <span>Replace (استبدال شامل)</span>
                      </div>
                      <span className="text-[10px] text-white/50 leading-tight">
                        Wipe current database and restore cleanly from backup.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-mono text-white/40">Ready to restore</span>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!fileContent || importMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-5 py-2 text-xs font-bold text-black shadow-md shadow-cyan-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              <span>{importMutation.isPending ? 'Restoring...' : '🚀 Restore Backup'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
