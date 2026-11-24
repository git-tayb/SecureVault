const router = require('express').Router(), multer = require('multer'), path = require('path'), crypto = require('crypto'), FileType = require('file-type'), rl = require('express-rate-limit');
const db = require('../lib/db'), storage = require('../lib/storage'), log = require('../lib/log'), cfg = require('../config');
const { encryptFile } = require('../lib/crypto'), { requireAuth } = require('../middleware/security'), { getAccess, sendDecrypted } = require('../lib/access');
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.maxFileBytes, files: 1 } });
const upLimiter = rl({ windowMs: 3600e3, limit: 30, keyGenerator: (req) => req.user.id, message: { error: 'Upload limit reached' } });
// Allow-list: extension -> allowed detected MIME (magic bytes checked, not just client-supplied type)
const ALLOWED = { '.pdf': ['application/pdf'], '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'], '.txt': ['text/plain'] };
const CLIENT_MIME = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const cleanName = (n) => path.basename(n).replace(/[^\w.\- ()]/g, '_').slice(0, 120);

router.post('/', upLimiter, upload.single('file'), async (req, res) => {
  const f = req.file; if (!f) return res.status(400).json({ error: 'No file provided' });
  const name = cleanName(Buffer.from(f.originalname, 'latin1').toString('utf8')), ext = path.extname(name).toLowerCase();
  const reject = async (why) => { await log(req, { userId: req.user.id, action: 'UPLOAD_REJECTED', details: { reason: why, ext } }); return res.status(415).json({ error: 'File type not allowed' }); };
  if (!ALLOWED[ext] || f.mimetype !== CLIENT_MIME[ext] && !(ext === '.docx' && f.mimetype === 'application/zip')) return reject('ext/mime');
  const t = await FileType.fromBuffer(f.buffer);
  if (ext === '.txt') { if (t || f.buffer.includes(0)) return reject('binary-as-txt'); }
  else if (!t || !ALLOWED[ext].includes(t.mime)) return reject('magic-bytes');
  const id = crypto.randomUUID(), e = encryptFile(id, f.buffer), storagePath = `${req.user.id}/${id}.enc`;
  const up = await storage.upload(storagePath, e.body.ct, { contentType: 'application/octet-stream', upsert: false });
  if (up.error) return res.status(502).json({ error: 'Storage unavailable' });
  try {
    await db.query(`insert into files(id,owner_id,original_name,mime_type,size_bytes,storage_path,sha256_plain,sha256_cipher,iv,auth_tag,wrapped_dek,dek_iv,dek_tag)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, req.user.id, name, CLIENT_MIME[ext], f.size, storagePath, e.sha256Plain, e.sha256Cipher, e.body.iv, e.body.tag, e.wrapped.ct, e.wrapped.iv, e.wrapped.tag]);
  } catch (err) { await storage.remove([storagePath]); throw err; }
  await log(req, { userId: req.user.id, action: 'FILE_UPLOAD', fileId: id, details: { size: f.size } });
  res.status(201).json({ id, name, size: f.size, sha256: e.sha256Plain });
});

const cols = 'id,original_name,size_bytes,mime_type,sha256_plain,created_at';
router.get('/', async (req, res) => res.json({ files: (await db.query(`select ${cols}, true as encrypted, (select count(*) from shared_links l where l.file_id=files.id and l.revoked_at is null and l.expires_at>now())::int + (select count(*) from file_permissions p where p.file_id=files.id)::int as shares from files where owner_id=$1 order by created_at desc`, [req.user.id])).rows }));
router.get('/shared-with-me', async (req, res) => res.json({ files: (await db.query(`select f.id,f.original_name,f.size_bytes,f.created_at,u.name as owner_name,p.can_download from file_permissions p join files f on f.id=p.file_id join users u on u.id=f.owner_id where p.grantee_id=$1 order by p.created_at desc`, [req.user.id])).rows }));

router.get('/:id/download', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const a = await getAccess(req.user, req.params.id);
  if (!a || !a.canDownload) { await log(req, { userId: req.user.id, action: 'ACCESS_DENIED', fileId: req.params.id, details: { reason: 'download' } }); return res.status(a ? 403 : 404).json({ error: a ? 'Download not permitted' : 'Not found' }); }
  await sendDecrypted(req, res, a.file, req.user.id, a.via);
});

router.delete('/:id', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { rows } = await db.query('select storage_path from files where id=$1 and owner_id=$2', [req.params.id, req.user.id]);
  if (!rows[0]) { await log(req, { userId: req.user.id, action: 'ACCESS_DENIED', fileId: req.params.id, details: { reason: 'delete' } }); return res.status(404).json({ error: 'Not found' }); }
  await storage.remove([rows[0].storage_path]); await db.query('delete from files where id=$1', [req.params.id]);
  await log(req, { userId: req.user.id, action: 'FILE_DELETE', fileId: req.params.id }); res.json({ ok: true });
});
module.exports = router;
