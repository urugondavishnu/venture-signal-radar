import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!_jwks) {
    const url = process.env.SUPABASE_URL;
    if (!url) return null;
    _jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  }
  return _jwks;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Middleware: validate Supabase JWT token from Authorization header.
 * Attaches userId and userEmail to the request.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const JWKS = getJWKS();
  if (!JWKS) {
    console.error('[Auth] SUPABASE_URL is not set — cannot verify JWTs');
    res.status(500).json({ error: 'Server auth not configured' });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS);

    (req as AuthenticatedRequest).userId = payload.sub!;
    (req as AuthenticatedRequest).userEmail = (payload.email as string) || '';
    next();
  } catch (err) {
    console.error('[Auth] JWT verification failed:', (err as Error).message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
