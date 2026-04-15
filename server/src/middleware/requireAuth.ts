import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, PublicUser } from '../types.js';
import { toPublicUserRecord, type UserStore } from '../store/userStore.js';

type AuthenticatedResponseLocals = {
  authUser?: PublicUser;
};

function extractBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
}

export function requireAuth(jwtSecret: string, userStore: UserStore): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: 'Missing bearer token.' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;
      const user = await userStore.findById(payload.sub);

      if (!user) {
        return res.status(401).json({ message: 'User not found for token.' });
      }

      (res.locals as AuthenticatedResponseLocals).authUser = toPublicUserRecord(user);
      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  };
}

