const router = require('express').Router(), db = require('../lib/db'), { requireAuth, requireRole } = require('../middleware/security');
router.use(requireAuth);
router.get('/dashboard', async (req, res) => {
  const id = req.user.id;
  const s = (await db.query(`select (select count(*) from files where owner_id=$1)::int files, (select coalesce(sum(size_bytes),0) from files where owner_id=$1)::bigint bytes,
    (select count(*) from file_permissions where grantee_id=$1)::int shared_with_me,
    (select count(*) from shared_links where created_by=$1 and revoked_at is null and expires_at>now())::int active_links,
    (select count(*) from activity_logs where user_id=$1 and action in ('LOGIN_FAILED','ACCESS_DENIED') and created_at>now()-interval '7 days')::int alerts`, [id])).rows[0];
  const recent = (await db.query('select id,action,created_at,ip from activity_logs where user_id=$1 order by id desc limit 6', [id])).rows;
  res.json({ stats: s, recent });
});
router.get('/logs', async (req, res) => res.json({ logs: (await db.query('select id,action,file_id,ip,details,created_at from activity_logs where user_id=$1 order by id desc limit 200', [req.user.id])).rows }));
// RBAC: admin-only view of all activity (metadata only, no file access)
router.get('/admin/logs', requireRole('admin'), async (req, res) => res.json({ logs: (await db.query('select l.id,l.action,l.file_id,l.ip,l.created_at,u.email from activity_logs l left join users u on u.id=l.user_id order by l.id desc limit 300')).rows }));
module.exports = router;
