import jwt from 'jsonwebtoken';

export type JwtUserPayload = {
  id: number;
  email: string;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function signAccessToken(user: JwtUserPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as string;
  return jwt.sign(
    { id: user.id, email: user.email },
    getSecret(),
    { expiresIn } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, getSecret());
  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token');
  }
  const id = Number((decoded as any).id);
  const email = String((decoded as any).email || '');
  if (!id || !email) throw new Error('Invalid token payload');
  return { id, email };
}
