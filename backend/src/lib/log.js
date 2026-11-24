const db = require('./db');
// Never put passwords, tokens, keys or file contents in `details`.
module.exports = async (req, { userId = null, action, fileId = null, details = {} }) => {
  try {
    await db.query('insert into activity_logs(user_id,action,file_id,ip,user_agent,details) values($1,$2,$3,$4,$5,$6)',
      [userId, action, fileId, req.ip, (req.get('user-agent') || '').slice(0, 200), details]);
  } catch (e) { console.error('log write failed'); }
};
