import type { NextFunction, Request, Response } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ message: 'Server Error' });
}
