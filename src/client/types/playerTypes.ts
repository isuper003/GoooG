export interface PlaylistItem {
  id: string;
  name: string;
  size: number;
  file?: File;
  directUrl?: string;
  duration?: number;
}

export type PlayerLayoutMode = 'single' | 'grid-2x2' | 'quad-vertical' | 'hybrid-1-3';

export type LoopMode = 'off' | 'all' | 'one';

export type FitMode = 'contain' | 'cover';

export type PanDirection = 'none' | 'x' | 'y';

export interface PlayerInstanceConfig {
  id: number;
  label: string;
  isPrimary?: boolean;
}
