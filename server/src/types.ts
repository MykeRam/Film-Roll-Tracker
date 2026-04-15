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

