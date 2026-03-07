import { Router, Request, Response } from 'express';
import {
  setUserEmail,
  getUserSettings,
  setEmailFrequency,
  ensureUser,
  EmailFrequency,
} from '../services/user-service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const userRoutes = Router();

const VALID_FREQUENCIES: EmailFrequency[] = [
  'daily',
  'every_3_days',
  'weekly',
  'monthly',
  'only_on_run',
];

/**
 * POST /api/auth/init
 * Called after login/signup to ensure user record exists in our users table
 */
userRoutes.post('/auth/init', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, userEmail } = req as AuthenticatedRequest;
    const user = await ensureUser(userId, userEmail);
    res.json({ success: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/set-email
 * Set the user's email address and optionally frequency
 */
userRoutes.post('/set-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { email, email_frequency } = req.body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    const freq = email_frequency && VALID_FREQUENCIES.includes(email_frequency)
      ? email_frequency
      : undefined;

    const user = await setUserEmail(userId, email, freq);
    res.json({ success: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/set-email-frequency
 */
userRoutes.post('/set-email-frequency', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { email_frequency } = req.body;

    if (!email_frequency || !VALID_FREQUENCIES.includes(email_frequency)) {
      res.status(400).json({
        error: `Valid frequency required: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    await setEmailFrequency(userId, email_frequency);
    res.json({ success: true, email_frequency });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/user-settings
 */
userRoutes.get('/user-settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const settings = await getUserSettings(userId);
    res.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Backward compat
userRoutes.get('/user-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const settings = await getUserSettings(userId);
    res.json({ email: settings.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
