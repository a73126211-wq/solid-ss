import { supabase } from './supabase';
import type { Profile, UserRole } from './types';

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;
  return profile;
}

export async function getCurrentUser(): Promise<{
  user: import('@supabase/supabase-js').User | null;
  profile: Profile | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await getProfile() : null;
  return { user, profile };
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'Admin' && profile.active;
}

export function isSupervisor(profile: Profile | null): boolean {
  return profile?.role === 'Supervisor' && profile.active;
}

export function isManager(profile: Profile | null): boolean {
  return isAdmin(profile) || isSupervisor(profile);
}

export function isCustomer(profile: Profile | null): boolean {
  return profile?.role === 'Customer' && profile.active;
}

export type ManagerLevel = 'admin' | 'supervisor' | 'none';

export function getManagerLevel(profile: Profile | null): ManagerLevel {
  if (!profile || !profile.active) return 'none';
  if (profile.role === 'Admin') return 'admin';
  if (profile.role === 'Supervisor') return 'supervisor';
  return 'none';
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password?next=/login`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateProfile(
  updates: { full_name?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'غير مسجّل الدخول' };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateUserEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function setProfileRole(
  targetUserId: string,
  newRole: 'Customer' | 'Supervisor'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('f_set_profile_role', {
    target_user_id: targetUserId,
    new_role: newRole,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleProfileActive(
  targetUserId: string,
  newActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('f_toggle_profile_active', {
    target_user_id: targetUserId,
    new_active: newActive,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
