import type { Data18WatchLaterBackupItem } from './data18Types';

export interface BackupLabel {
  name: string;
  createdAt?: string;
}

export interface BackupCharacterImage {
  url: string;
  position: number;
}

export interface BackupCharacter {
  name: string;
  categoryKey: 'trans' | 'sluts' | 'twinks';
  correctCount: number;
  wrongCount: number;
  srsLevel: number;
  isActive: boolean;
  nextReviewAt?: string | null;
  lastReviewedAt?: string | null;
  intervalHours?: number | null;
  isLeech: boolean;
  leechStreak: number;
  createdAt: string;
  updatedAt: string;
  images: BackupCharacterImage[];
  labelNames: string[];
}

export interface BackupGameAnswer {
  characterName: string;
  selectedCharacterName?: string | null;
  phase: 'main' | 'remediation';
  isCorrect: boolean;
  roundIndex: number;
  srsLevelBefore: number;
  srsLevelAfter: number;
  elapsedMs?: number | null;
  fluency?: string | null;
  answeredAt: string;
}

export interface BackupGameSession {
  scope: 'trans' | 'sluts' | 'twinks' | 'mix';
  mode: 'classic' | 'match';
  preset?: string | null;
  plannedRounds?: number | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  finishedAt?: string | null;
  totalRoundsPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  remediationRoundsPlayed: number;
  answers: BackupGameAnswer[];
}

export interface BackupData18Favorite {
  path: string;
  kind: 'performer' | 'studio' | 'site' | 'network' | 'series';
  slug: string;
  name: string;
  lastSeenSceneId?: string | null;
  createdAt: string;
}

export interface BackupSummary {
  charactersCount: number;
  labelsCount: number;
  gameSessionsCount: number;
  gameAnswersCount: number;
  data18FavoritesCount: number;
  data18WatchLaterCount: number;
}

export interface FullAppBackup {
  version: 1;
  app: 'GoooG';
  exportedAt: string;
  summary: BackupSummary;
  data: {
    labels: BackupLabel[];
    characters: BackupCharacter[];
    gameSessions: BackupGameSession[];
    data18Favorites: BackupData18Favorite[];
    data18WatchLater: Data18WatchLaterBackupItem[];
  };
}

export interface FullBackupImportResponse {
  ok: boolean;
  mode: 'merge' | 'replace';
  imported: {
    characters: number;
    labels: number;
    gameSessions: number;
    gameAnswers: number;
    data18Favorites: number;
    data18WatchLater: number;
  };
}
