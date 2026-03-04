import { supabase } from '../db/supabase';
import { User } from '../types';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export type EmailFrequency = 'daily' | 'every_3_days' | 'weekly' | 'monthly' | 'only_on_run';

/**
 * Set or update user email and optionally frequency
 */
export async function setUserEmail(
  email: string,
  emailFrequency?: EmailFrequency,
): Promise<User> {
  const updates: Record<string, unknown> = { email };
  if (emailFrequency) {
    updates.email_frequency = emailFrequency;
  }

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', DEFAULT_USER_ID)
      .select()
      .single();

    if (error) throw new Error(`Failed to update email: ${error.message}`);
    return data as User;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ user_id: DEFAULT_USER_ID, ...updates })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as User;
}

/**
 * Update only email frequency
 */
export async function setEmailFrequency(frequency: EmailFrequency): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ email_frequency: frequency })
    .eq('user_id', DEFAULT_USER_ID);

  if (error) throw new Error(`Failed to update frequency: ${error.message}`);
}

/**
 * Get user email
 */
export async function getUserEmail(): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('user_id', DEFAULT_USER_ID)
    .single();

  return data?.email || null;
}

/**
 * Get user settings (email + frequency)
 */
export async function getUserSettings(): Promise<{
  email: string | null;
  email_frequency: EmailFrequency;
}> {
  const { data } = await supabase
    .from('users')
    .select('email, email_frequency')
    .eq('user_id', DEFAULT_USER_ID)
    .single();

  return {
    email: data?.email || null,
    email_frequency: (data?.email_frequency as EmailFrequency) || 'daily',
  };
}
