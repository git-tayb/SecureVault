'use client';
import { useEffect, useState } from 'react'; import { api, fmtDate } from '@/lib/api';
const bad = ['LOGIN_FAILED', 'ACCESS_DENIED', 'INTEGRITY_FAILURE', 'LOGIN_LOCKED', 'UPLOAD_REJECTED'];
export default function Activity() {
  const [logs, setLogs] = useState(null), [admin, setAdmin] = useState(false), [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { api('/auth/me').then((r) => setIsAdmin(r.user.role === 'admin')); }, []);
  useEffect(() => { setLogs(null); api(admin ? '/admin/logs' : '/logs').then((r) => setLogs(r.logs)); }, [admin]);
  return (<div className="space-y-4"><div className="flex justify-between items-center"><h1 className="text-2xl font-semibold">Security Activity</h1>
    {isAdmin && <label className="text-sm flex gap-2"><input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />Admin: all users</label>}</div>
    <div className="card overflow-x-auto">{!logs ? 'Loading…' : <table className="w-full text-sm"><thead><tr><th className="th">Event</th>{admin && <th className="th">User</th>}<th className="th">IP</th><th className="th">Time</th></tr></thead><tbody>
      {logs.map((l) => <tr key={l.id} className="border-t border-navy-700"><td className={`py-2 ${bad.includes(l.action) ? 'text-red-400' : ''}`}>{l.action}</td>{admin && <td>{l.email || '—'}</td>}<td>{l.ip}</td><td>{fmtDate(l.created_at)}</td></tr>)}</tbody></table>}</div></div>);
}
