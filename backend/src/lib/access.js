const db = require('./db'), storage = require('./storage'), { decryptFile } = require('./crypto'), log = require('./log');
// File-level authorization, enforced server-side on every request.
// Returns { file, canDownload } or null. Admins get NO content access (confidentiality > convenience).
async function getAccess(user, fileId) {
  const { rows } = await db.query('select * from files where id=$1', [fileId]); const file = rows[0]; if (!file) return null;
  if (file.owner_id === user.id) return { file, canDownload: true, via: 'owner' };
  const p = await db.query('select can_download from file_permissions where file_id=$1 and grantee_id=$2', [fileId, user.id]);
  return p.rows[0] ? { file, canDownload: p.rows[0].can_download, via: 'permission' } : null;
}
async function sendDecrypted(req, res, file, userId, via) {
  const { data, error } = await storage.download(file.storage_path);
  if (error) return res.status(502).json({ error: 'Storage unavailable' });
  let plain;
  try { plain = decryptFile(file, Buffer.from(await data.arrayBuffer())); }
  catch { await log(req, { userId, action: 'INTEGRITY_FAILURE', fileId: file.id }); return res.status(409).json({ error: 'File integrity check failed. File may have been tampered with.' }); }
  await log(req, { userId, action: 'FILE_DOWNLOAD', fileId: file.id, details: { via } });
  res.set({ 'Content-Type': file.mime_type, 'Content-Length': plain.length, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`, 'X-Integrity-SHA256': file.sha256_plain, 'Cache-Control': 'no-store' });
  res.send(plain);
}
module.exports = { getAccess, sendDecrypted };
