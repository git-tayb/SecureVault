const crypto = require('crypto'), jwt = require('jsonwebtoken'), cfg = require('../config'), db = require('../lib/db'), log = require('../lib/log');
const cookieOpts = { sameSite: 'strict', secure: cfg.prod, path: '/' };
// CSRF: SameSite=Strict + double-submit token (cookie must equal X-CSRF-Token header)
exports.issueCsrf = (req, res) => {
  res.cookie('csrf', crypto.randomBytes(32).toString('hex'), { ...cookieOpts, httpOnly: false, maxAge: 288e5 }); res.json({ ok: true });
};
exports.csrf = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const a = Buffer.from(req.cookies.csrf || ''), b = Buffer.from(req.get('x-csrf-token') || '');
  if (!a.length || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: 'Invalid CSRF token' });
  next();
};
exports.setSession = (res, user) => {
  const token = jwt.sign({ sub: user.id }, cfg.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
  res.cookie('token', token, { ...cookieOpts, httpOnly: true, maxAge: 36e5 });
};
exports.clearSession = (res) => res.clearCookie('token', cookieOpts);
// Authentication: verify JWT, then reload user so role changes/deletions apply immediately
exports.requireAuth = async (req, res, next) => {
  try {
    const p = jwt.verify(req.cookies.token || '', cfg.jwtSecret, { algorithms: ['HS256'] });
    const { rows } = await db.query('select id,email,name,role from users where id=$1', [p.sub]);
    if (!rows[0]) throw new Error(); req.user = rows[0]; next();
  } catch { res.status(401).json({ error: 'Authentication required' }); }
};
// RBAC
exports.requireRole = (role) => async (req, res, next) => {
  if (req.user.role !== role) { await log(req, { userId: req.user.id, action: 'ACCESS_DENIED', details: { reason: 'role' } }); return res.status(403).json({ error: 'Forbidden' }); }
  next();
};
