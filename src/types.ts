export type RollStatus = 'loaded' | 'shot' | 'developed' | 'scanned';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface FilmRoll {
  id: string;
  userId: string;
  title: string;
  camera: string;
  lens: string;
  filmStock: string;
  iso: number;
  status: RollStatus;
  dateLoaded: string;
  notes: string;
}

export interface RollUpload {
  id: string;
  rollId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

export interface RollActivity {
  id: string;
  rollId: string | null;
  userId: string;
  eventType: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsCountBucket {
  label: string;
  count: number;
}

export interface AnalyticsOverview {
  summary: {
    totalRolls: number;
    completedRolls: number;
    openRolls: number;
    totalUploads: number;
    totalActivity: number;
    averageRollAgeDays: number | null;
    statusCounts: Record<RollStatus, number>;
  };
  topCameras: AnalyticsCountBucket[];
  topFilmStocks: AnalyticsCountBucket[];
  monthlyRolls: AnalyticsCountBucket[];
  monthlyUploads: AnalyticsCountBucket[];
  recentActivity: RollActivity[];
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
