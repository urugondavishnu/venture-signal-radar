import { supabase } from '../db/supabase';
import { User } from '../types';

export type EmailFrequency = 'daily' | 'every_3_days' | 'weekly' | 'monthly' | 'only_on_run';

/**
 * Ensure a user record exists in the users table (called on first auth)
 */
export async function ensureUser(userId: string, email: string): Promise<User> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) return existing as User;

  const { data, error } = await supabase
    .from('users')
    .upsert({ user_id: userId, email }, { onConflict: 'email' })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as User;
}

/**
 * Set or update user email and optionally frequency
 */
export async function setUserEmail(
  userId: string,
  email: string,
  emailFrequency?: EmailFrequency,
): Promise<User> {
  const updates: Record<string, unknown> = { email };
  if (emailFrequency) {
    updates.email_frequency = emailFrequency;
  }

  await ensureUser(userId, email);

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update email: ${error.message}`);
  return data as User;
}

/**
 * Update only email frequency
 */
export async function setEmailFrequency(userId: string, frequency: EmailFrequency): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ email_frequency: frequency })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update frequency: ${error.message}`);
}

/**
 * Get user email
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('user_id', userId)
    .single();

  return data?.email || null;
}

/**
 * Get user settings (email + frequency)
 */
export async function getUserSettings(userId: string): Promise<{
  email: string | null;
  email_frequency: EmailFrequency;
}> {
  const { data } = await supabase
    .from('users')
    .select('email, email_frequency')
    .eq('user_id', userId)
    .single();

  return {
    email: data?.email || null,
    email_frequency: (data?.email_frequency as EmailFrequency) || 'daily',
  };
}

/**
 * Get all users (for scheduler)
 */
export async function getAllUsers(): Promise<Array<{ user_id: string; email: string; email_frequency: EmailFrequency }>> {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, email, email_frequency');

  if (error) return [];
  return (data || []) as Array<{ user_id: string; email: string; email_frequency: EmailFrequency }>;
}
