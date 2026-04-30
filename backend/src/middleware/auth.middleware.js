const { supabaseAdmin } = require('../config/supabase');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user profile with role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = profile;
    req.token = token;
    next();
  } catch (err) {
    const isNetworkError = err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
      || err?.cause?.code === 'ECONNRESET'
      || err?.message === 'fetch failed';
    if (isNetworkError) {
      return res.status(503).json({ error: 'Authentication service temporarily unavailable — please retry' });
    }
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticate };
