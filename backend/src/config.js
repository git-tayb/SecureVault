require('dotenv').config();
const need = (k) => { const v = process.env[k]; if (!v) throw new Error(`Missing env ${k}`); return v; };
const masterKey = Buffer.from(need('MASTER_KEY'), 'base64');
if (masterKey.length !== 32) throw new Error('MASTER_KEY must be 32 bytes (base64)');
if (need('JWT_SECRET').length < 32) throw new Error('JWT_SECRET too short');
module.exports = {
  port: +process.env.PORT || 4000, prod: process.env.NODE_ENV === 'production',
  trustProxy: +process.env.TRUST_PROXY || 0, masterKey,
  jwtSecret: process.env.JWT_SECRET, bucket: process.env.SUPABASE_BUCKET || 'encrypted-files',
  maxFileBytes: (+process.env.MAX_FILE_MB || 10) * 1024 * 1024,
  databaseUrl: need('DATABASE_URL'), supabaseUrl: need('SUPABASE_URL'), supabaseKey: need('SUPABASE_SERVICE_ROLE_KEY'),
};
