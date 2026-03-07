import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../db/supabase';

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
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as AuthenticatedRequest).userId = data.user.id;
    (req as AuthenticatedRequest).userEmail = data.user.email || '';
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
