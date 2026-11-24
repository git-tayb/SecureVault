const router = require('express').Router(), argon2 = require('argon2'), { z } = require('zod'), rl = require('express-rate-limit');
const db = require('../lib/db'), log = require('../lib/log'), { setSession, clearSession, requireAuth } = require('../middleware/security');
const authLimiter = rl({ windowMs: 15 * 60e3, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const A2 = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const password = z.string().min(12, 'min 12 chars').max(128).regex(/[a-z]/, 'needs lowercase').regex(/[A-Z]/, 'needs uppercase').regex(/\d/, 'needs digit').regex(/[^A-Za-z0-9]/, 'needs symbol');
const reg = z.object({ name: z.string().trim().min(2).max(60), email: z.string().trim().toLowerCase().email().max(120), password });
const MAX_FAILS = 5, LOCK_MIN = 15; let dummy; argon2.hash('dummy-password', A2).then((h) => (dummy = h));
const bad = (res, e) => res.status(400).json({ error: 'Invalid input: ' + e.issues.map((i) => i.message).join(', ') });

router.post('/register', authLimiter, async (req, res) => {
  const p = reg.safeParse(req.body); if (!p.success) return bad(res, p.error);
  const { name, email, password: pw } = p.data;
  const r = await db.query('insert into users(name,email,password_hash) values($1,$2,$3) on conflict(email) do nothing returning id', [name, email, await argon2.hash(pw, A2)]);
  if (!r.rows[0]) return res.status(409).json({ error: 'Unable to register with these details' }); // no account enumeration
  await log(req, { userId: r.rows[0].id, action: 'REGISTER' }); res.status(201).json({ ok: true });
});

router.post('/login', authLimiter, async (req, res) => {
  const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().max(128) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid credentials' });
  const { rows } = await db.query('select * from users where email=$1', [p.data.email]); const u = rows[0];
  if (u?.locked_until && u.locked_until > new Date()) { await log(req, { userId: u.id, action: 'LOGIN_LOCKED' }); return res.status(429).json({ error: 'Account temporarily locked. Try later.' }); }
  const ok = await argon2.verify(u ? u.password_hash : dummy, p.data.password).catch(() => false); // equalises timing
  if (!u || !ok) {
    if (u) await db.query("update users set failed_attempts=failed_attempts+1, locked_until=case when failed_attempts+1>=$2 then now()+make_interval(mins=>$3) else null end where id=$1", [u.id, MAX_FAILS, LOCK_MIN]);
    await log(req, { userId: u?.id, action: 'LOGIN_FAILED' }); return res.status(401).json({ error: 'Invalid email or password' });
  }
  await db.query('update users set failed_attempts=0, locked_until=null where id=$1', [u.id]);
  setSession(res, u); await log(req, { userId: u.id, action: 'LOGIN_SUCCESS' });
  res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

router.post('/logout', requireAuth, async (req, res) => { await log(req, { userId: req.user.id, action: 'LOGOUT' }); clearSession(res); res.json({ ok: true }); });
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
router.put('/password', requireAuth, authLimiter, async (req, res) => {
  const p = z.object({ current: z.string().max(128), next: password }).safeParse(req.body); if (!p.success) return bad(res, p.error);
  const { rows } = await db.query('select password_hash from users where id=$1', [req.user.id]);
  if (!(await argon2.verify(rows[0].password_hash, p.data.current))) return res.status(401).json({ error: 'Current password incorrect' });
  await db.query('update users set password_hash=$2 where id=$1', [req.user.id, await argon2.hash(p.data.next, A2)]);
  await log(req, { userId: req.user.id, action: 'PASSWORD_CHANGED' }); res.json({ ok: true });
});
module.exports = router;
