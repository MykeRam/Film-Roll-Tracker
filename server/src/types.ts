export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export type RollStatus = 'loaded' | 'shot' | 'developed' | 'scanned';

export type RollRecord = {
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
  createdAt: Date;
  updatedAt: Date;
};

export type RollUploadRecord = {
  id: string;
  rollId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: Date;
};

export type RollActivityRecord = {
  id: string;
  rollId: string | null;
  userId: string;
  eventType: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type RollInput = {
  title: string;
  camera: string;
  lens: string;
  filmStock: string;
  iso: number;
  status: RollStatus;
  dateLoaded: string;
  notes: string;
};

export type UploadInput = {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
};

export type ActivityInput = {
  eventType: string;
  summary: string;
  payload?: Record<string, unknown>;
};
