import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type JwtUserPayload } from '../utils/jwt';

declare global {
  // eslint-disable-next-line no-var
  var __reqUser: any;
}

export type AuthedRequest = Request & { user?: JwtUserPayload };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = verifyAccessToken(token);
    req.user = user;
    return next();
  } catch (e: any) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
