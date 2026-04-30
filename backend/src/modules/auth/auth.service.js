const { supabase, supabaseAdmin } = require('../../config/supabase');

async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw Object.assign(new Error(error.message), { status: 400 });

  const userId = data.user.id;
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({ id: userId, email, name, role: 'member' });

  if (profileError) throw Object.assign(new Error(profileError.message), { status: 500 });

  return { user: data.user, session: data.session };
}

async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw Object.assign(new Error(error.message), { status: 401 });

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, avatar_url')
    .eq('id', data.user.id)
    .single();

  // Auto-create profile if missing (e.g. user existed in auth but not in public.users)
  if (profileErr || !profile) {
    const { data: newProfile } = await supabaseAdmin
      .from('users')
      .insert({ id: data.user.id, email: data.user.email, name: data.user.email.split('@')[0], role: 'member' })
      .select()
      .single();
    return { user: newProfile, session: data.session };
  }

  return { user: profile, session: data.session };
}

async function signOut(token) {
  const { error } = await supabase.auth.signOut();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
}

async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, avatar_url, created_at')
    .eq('id', userId)
    .single();
  if (error) throw Object.assign(new Error('User not found'), { status: 404 });
  return data;
}

async function updateProfile(userId, updates) {
  const allowed = ['name', 'avatar_url'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ ...filtered, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
}

module.exports = { signUp, signIn, signOut, getProfile, updateProfile };
