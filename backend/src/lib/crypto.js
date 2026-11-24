const crypto = require('crypto'); const { masterKey } = require('../config');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
// AES-256-GCM, fresh random 96-bit nonce per call; AAD binds ciphertext to its file id
function enc(key, pt, aad) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(aad);
  const ct = Buffer.concat([c.update(pt), c.final()]); return { iv, ct, tag: c.getAuthTag() };
}
function dec(key, { iv, ct, tag }, aad) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAAD(aad); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]); // throws if tampered
}
// Envelope encryption: unique random DEK per file, wrapped by the master KEK (server env only)
function encryptFile(fileId, plain) {
  const aad = Buffer.from(fileId), dek = crypto.randomBytes(32);
  const body = enc(dek, plain, aad), wrapped = enc(masterKey, dek, aad); dek.fill(0);
  return { body, wrapped, sha256Plain: sha256(plain), sha256Cipher: sha256(body.ct) };
}
class IntegrityError extends Error { constructor() { super('integrity'); this.status = 409; } }
function decryptFile(f, cipherBuf) {
  try {
    if (sha256(cipherBuf) !== f.sha256_cipher) throw new IntegrityError();
    const aad = Buffer.from(f.id);
    const dek = dec(masterKey, { iv: f.dek_iv, ct: f.wrapped_dek, tag: f.dek_tag }, aad);
    const plain = dec(dek, { iv: f.iv, ct: cipherBuf, tag: f.auth_tag }, aad); dek.fill(0);
    if (sha256(plain) !== f.sha256_plain) throw new IntegrityError();
    return plain;
  } catch { throw new IntegrityError(); }
}
module.exports = { sha256, encryptFile, decryptFile, IntegrityError };
