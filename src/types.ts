export type RollStatus = 'loaded' | 'shot' | 'developed' | 'scanned';

export interface FilmRoll {
  id: string;
  title: string;
  camera: string;
  lens: string;
  filmStock: string;
  iso: number;
  status: RollStatus;
  dateLoaded: string;
  notes: string;
}

export interface RollDraft {
  title: string;
  camera: string;
  lens: string;
  filmStock: string;
  iso: string;
  status: RollStatus;
  dateLoaded: string;
  notes: string;
}
