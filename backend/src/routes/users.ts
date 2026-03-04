import { Router, Request, Response } from 'express';
import {
  setUserEmail,
  getUserSettings,
  setEmailFrequency,
  EmailFrequency,
} from '../services/user-service';

export const userRoutes = Router();

const VALID_FREQUENCIES: EmailFrequency[] = [
  'daily',
  'every_3_days',
  'weekly',
  'monthly',
  'only_on_run',
];

/**
 * POST /api/set-email
 * Set the user's email address and optionally frequency
 */
userRoutes.post('/set-email', async (req: Request, res: Response) => {
  try {
    const { email, email_frequency } = req.body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    const freq = email_frequency && VALID_FREQUENCIES.includes(email_frequency)
      ? email_frequency
      : undefined;

    const user = await setUserEmail(email, freq);
    res.json({ success: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/set-email-frequency
 */
userRoutes.post('/set-email-frequency', async (req: Request, res: Response) => {
  try {
    const { email_frequency } = req.body;

    if (!email_frequency || !VALID_FREQUENCIES.includes(email_frequency)) {
      res.status(400).json({
        error: `Valid frequency required: ${VALID_FREQUENCIES.join(', ')}`,
      });
      return;
    }

    await setEmailFrequency(email_frequency);
    res.json({ success: true, email_frequency });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/user-settings
 */
userRoutes.get('/user-settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getUserSettings();
    res.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Backward compat
userRoutes.get('/user-email', async (_req: Request, res: Response) => {
  try {
    const settings = await getUserSettings();
    res.json({ email: settings.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
