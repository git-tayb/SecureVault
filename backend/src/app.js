require('./lib/asyncwrap');
const cfg = require('./config');
const express = require('express'), helmet = require('helmet'), cookieParser = require('cookie-parser'), rl = require('express-rate-limit');
const { csrf, issueCsrf } = require('./middleware/security');
const app = express(); app.set('trust proxy', cfg.trustProxy); app.disable('x-powered-by');
app.use(helmet());
app.get('/', (req, res) => {
  res.json({
    message: 'SecureVault API is running!',
    status: 'OK'
  });
});
app.use(rl({ windowMs: 15 * 60e3, limit: 300, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests' } })); // availability
app.use(express.json({ limit: '10kb' })); app.use(cookieParser());
// Frontend proxies /api via Next.js rewrites => same-origin, no CORS needed (reduces attack surface)
app.get('/api/csrf', issueCsrf); app.use('/api', csrf);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api', require('./routes/shares'));
app.use('/api', require('./routes/misc'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File exceeds ${cfg.maxFileBytes / 1048576} MB limit` });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Bad request' });
  console.error('Unhandled:', err.message); // message only: no stack/data leakage
  res.status(500).json({ error: 'Internal server error' });
});
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e?.message));
app.listen(cfg.port, () => console.log(`API on :${cfg.port}`));
