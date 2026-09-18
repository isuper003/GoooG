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
}

export interface GameSessionCreateResponse {
  sessionId: number;
  pool: GameSessionPoolCharacter[];
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
