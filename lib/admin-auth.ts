import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase-server';

export type StaffRole =
  | 'team_manager'
  | 'editor'
  | 'statistician'
  | 'admin'
  | 'super_admin';

export const getStaffSession = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role, managed_team_id')
    .eq('id', authData.user.id)
    .maybeSingle();

  return { supabase, user: authData.user, profile };
});

export async function requireStaff(roles?: StaffRole[]) {
  const session = await getStaffSession();
  if (!session.supabase || !session.user) redirect('/login?next=/admin');

  const role = String(session.profile?.role ?? 'member') as StaffRole;
  const isStaff = ['team_manager', 'editor', 'statistician', 'admin', 'super_admin'].includes(role);
  if (!isStaff || (roles && !roles.includes(role))) {
    redirect('/admin?error=forbidden');
  }

  return { supabase: session.supabase, user: session.user, profile: session.profile, role };
}
