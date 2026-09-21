import type { ConfusionEntry, HeatCellState } from './srs';

export interface CategoryDTO {
  id: number;
  key: string;
  label: string;
  sortOrder: number;
}

export interface LabelDTO {
  id: number;
  name: string;
}

export interface CharacterImageDTO {
  id: number;
  url: string;
  position: number;
}

export interface CharacterDTO {
  id: number;
  name: string;
  categoryKey: string;
  labels: LabelDTO[];
  images: CharacterImageDTO[];
  correctCount: number;
  wrongCount: number;
  srsLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameSessionPoolCharacter {
  id: number;
  name: string;
  images: string[];
  srsLevel: number;
  correctCount: number;
  wrongCount: number;
  isLeech?: boolean;
  nextReviewAt?: string | null;
}

export interface CategoryStats {
  category: string;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface StatsOverview {
  gamesPlayed: number;
  totalRoundsAnswered: number;
  overallAccuracy: number;
  byCategory: CategoryStats[];
  totalCorrect: number;
  totalWrong: number;
  activeCharacters: number;
  masteredCharacters: number;
  strugglingCharacters: number;
}

export interface GameSessionCreateResponse {
  sessionId: number;
  pool: GameSessionPoolCharacter[];
  focusIds?: number[] | null;
  confusion?: Record<number, ConfusionEntry[]>;
  latencyBaseline?: {
    classic: number | null;
    match: number | null;
    classicSamples: number;
    matchSamples: number;
  };
}

export interface GameAnswerResponse {
  correctCount: number;
  wrongCount: number;
  srsLevel: number;
}

export interface HomePreviewsDTO {
  trans: string[];
  sluts: string[];
  twinks: string[];
  mix: string[];
}

export interface ConfusedPair {
  targetId: number;
  targetName: string;
  selectedId: number;
  selectedName: string;
  count: number;
}

export interface HeatmapCell {
  id: number;
  name: string;
  categoryKey: string;
  srsLevel: number;
  state: HeatCellState;
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
  byState: Record<HeatCellState, number>;
  criticalIds: number[];
}

export interface ReviewQueue {
  count: number;
  characterIds: number[];
}

export interface ReviewQueuesDTO {
  due: ReviewQueue;
  leech: ReviewQueue;
  quick: ReviewQueue;
}
