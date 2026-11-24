const router = require('express').Router(), crypto = require('crypto'), { z } = require('zod');
const db = require('../lib/db'), log = require('../lib/log'), { sha256 } = require('../lib/crypto');
const { requireAuth } = require('../middleware/security'), { sendDecrypted } = require('../lib/access');
router.use(requireAuth);
const uuid = z.string().uuid();
const owned = async (req, res) => {
  if (!uuid.safeParse(req.params.id).success) { res.status(404).json({ error: 'Not found' }); return null; }
  const { rows } = await db.query('select id from files where id=$1 and owner_id=$2', [req.params.id, req.user.id]);
  if (!rows[0]) { await log(req, { userId: req.user.id, action: 'ACCESS_DENIED', fileId: req.params.id, details: { reason: 'share' } }); res.status(404).json({ error: 'Not found' }); return null; }
  return rows[0];
};

// Link with 256-bit unpredictable token; only its SHA-256 hash is stored. Shown once.
router.post('/files/:id/link', async (req, res) => {
  if (!(await owned(req, res))) return;
  const p = z.object({ expiresInHours: z.number().int().min(1).max(720), allowDownload: z.boolean() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const token = crypto.randomBytes(32).toString('base64url');
  await db.query("insert into shared_links(file_id,created_by,token_hash,expires_at,allow_download) values($1,$2,$3,now()+make_interval(hours=>$4),$5)", [req.params.id, req.user.id, sha256(token), p.data.expiresInHours, p.data.allowDownload]);
  await log(req, { userId: req.user.id, action: 'FILE_SHARE_LINK', fileId: req.params.id, details: { hours: p.data.expiresInHours } });
  res.status(201).json({ token });
});
router.post('/files/:id/user', async (req, res) => {
  if (!(await owned(req, res))) return;
  const p = z.object({ email: z.string().trim().toLowerCase().email(), canDownload: z.boolean() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid input' });
  const u = (await db.query('select id from users where email=$1', [p.data.email])).rows[0];
  if (!u || u.id === req.user.id) return res.status(400).json({ error: 'Cannot share with that user' });
  await db.query('insert into file_permissions(file_id,grantee_id,granted_by,can_download) values($1,$2,$3,$4) on conflict(file_id,grantee_id) do update set can_download=$4', [req.params.id, u.id, req.user.id, p.data.canDownload]);
  await log(req, { userId: req.user.id, action: 'FILE_SHARE_USER', fileId: req.params.id }); res.status(201).json({ ok: true });
});
router.get('/files/:id/shares', async (req, res) => {
  if (!(await owned(req, res))) return;
  const links = (await db.query('select id,expires_at,allow_download,revoked_at,created_at from shared_links where file_id=$1 order by created_at desc', [req.params.id])).rows;
  const users = (await db.query('select p.id,u.email,p.can_download from file_permissions p join users u on u.id=p.grantee_id where p.file_id=$1', [req.params.id])).rows;
  res.json({ links, users });
});
router.delete('/links/:linkId', async (req, res) => {
  if (!uuid.safeParse(req.params.linkId).success) return res.status(404).json({ error: 'Not found' });
  const r = await db.query('update shared_links set revoked_at=now() where id=$1 and created_by=$2 and revoked_at is null returning file_id', [req.params.linkId, req.user.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  await log(req, { userId: req.user.id, action: 'SHARE_REVOKED', fileId: r.rows[0].file_id }); res.json({ ok: true });
});
router.delete('/permissions/:permId', async (req, res) => {
  if (!uuid.safeParse(req.params.permId).success) return res.status(404).json({ error: 'Not found' });
  const r = await db.query('delete from file_permissions where id=$1 and granted_by=$2 returning file_id', [req.params.permId, req.user.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  await log(req, { userId: req.user.id, action: 'SHARE_REVOKED', fileId: r.rows[0].file_id }); res.json({ ok: true });
});

// Link access: requires login + valid, unexpired, unrevoked token
const byToken = async (req, res) => {
  const { rows } = await db.query('select l.allow_download,l.expires_at,f.* from shared_links l join files f on f.id=l.file_id where l.token_hash=$1 and l.revoked_at is null and l.expires_at>now()', [sha256(String(req.params.token).slice(0, 100))]);
  if (!rows[0]) { await log(req, { userId: req.user.id, action: 'ACCESS_DENIED', details: { reason: 'bad-or-expired-link' } }); res.status(404).json({ error: 'Link invalid or expired' }); return null; }
  return rows[0];
};
router.get('/s/:token', async (req, res) => {
  const r = await byToken(req, res); if (!r) return;
  await log(req, { userId: req.user.id, action: 'SHARE_LINK_OPENED', fileId: r.id });
  res.json({ name: r.original_name, size: r.size_bytes, mime: r.mime_type, sha256: r.sha256_plain, expiresAt: r.expires_at, allowDownload: r.allow_download });
});
router.get('/s/:token/download', async (req, res) => {
  const r = await byToken(req, res); if (!r) return;
  if (!r.allow_download) { await log(req, { userId: req.user.id, action: 'ACCESS_DENIED', fileId: r.id, details: { reason: 'view-only-link' } }); return res.status(403).json({ error: 'Download not permitted on this link' }); }
  await sendDecrypted(req, res, r, req.user.id, 'link');
});
module.exports = router;
