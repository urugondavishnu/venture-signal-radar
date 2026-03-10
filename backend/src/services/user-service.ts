import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { users } from '../db/schema';
import { User } from '../types';

export type EmailFrequency = 'daily' | 'every_3_days' | 'weekly' | 'monthly' | 'only_on_run';

/**
 * Ensure a user record exists in the users table (called on first auth)
 */
export async function ensureUser(userId: string, email: string): Promise<User> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.user_id, userId))
    .limit(1);

  if (existing.length > 0) return rowToUser(existing[0]);

  const [inserted] = await db
    .insert(users)
    .values({ user_id: userId, email })
    .onConflictDoUpdate({ target: users.email, set: { user_id: userId } })
    .returning();

  return rowToUser(inserted);
}

/**
 * Set or update user email and optionally frequency
 */
export async function setUserEmail(
  userId: string,
  email: string,
  emailFrequency?: EmailFrequency,
): Promise<User> {
  await ensureUser(userId, email);

  const updates: Record<string, unknown> = { email };
  if (emailFrequency) updates.email_frequency = emailFrequency;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.user_id, userId))
    .returning();

  if (!updated) throw new Error('Failed to update email');
  return rowToUser(updated);
}

/**
 * Update only email frequency
 */
export async function setEmailFrequency(userId: string, frequency: EmailFrequency): Promise<void> {
  await db
    .update(users)
    .set({ email_frequency: frequency })
    .where(eq(users.user_id, userId));
}

/**
 * Get user email
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.user_id, userId))
    .limit(1);

  return rows[0]?.email ?? null;
}

/**
 * Get user settings (email + frequency)
 */
export async function getUserSettings(userId: string): Promise<{
  email: string | null;
  email_frequency: EmailFrequency;
}> {
  const rows = await db
    .select({ email: users.email, email_frequency: users.email_frequency })
    .from(users)
    .where(eq(users.user_id, userId))
    .limit(1);

  return {
    email: rows[0]?.email ?? null,
    email_frequency: (rows[0]?.email_frequency as EmailFrequency) ?? 'daily',
  };
}

/**
 * Get all users (for scheduler)
 */
export async function getAllUsers(): Promise<Array<{ user_id: string; email: string; email_frequency: EmailFrequency }>> {
  const rows = await db
    .select({
      user_id: users.user_id,
      email: users.email,
      email_frequency: users.email_frequency,
    })
    .from(users);

  return rows.map((r) => ({
    user_id: r.user_id,
    email: r.email,
    email_frequency: (r.email_frequency as EmailFrequency) ?? 'daily',
  }));
}

function rowToUser(row: typeof users.$inferSelect): User {
  return {
    user_id: row.user_id,
    email: row.email,
    created_at: row.created_at?.toISOString() ?? new Date().toISOString(),
  };
}
