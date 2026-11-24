'use client';
import { useEffect, useState } from 'react'; import { api } from '@/lib/api';
export default function Settings() {
  const [u, setU] = useState(null), [f, setF] = useState({ current: '', next: '' }), [msg, setMsg] = useState(null);
  useEffect(() => { api('/auth/me').then((r) => setU(r.user)); }, []);
  const save = async (e) => { e.preventDefault(); try { await api('/auth/password', { method: 'PUT', body: f }); setMsg({ ok: 1, t: 'Password updated' }); setF({ current: '', next: '' }); } catch (x) { setMsg({ t: x.message }); } };
  if (!u) return null;
  return (<div className="space-y-4 max-w-md"><h1 className="text-2xl font-semibold">Profile & Settings</h1>
    <div className="card text-sm space-y-1"><div>Name: {u.name}</div><div>Email: {u.email}</div><div>Role: {u.role}</div></div>
    <form onSubmit={save} className="card space-y-3"><h2 className="font-medium">Change password</h2>
      <input className="input" type="password" placeholder="Current password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" required />
      <input className="input" type="password" placeholder="New password (12+ chars, mixed)" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" required />
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.t}</p>}<button className="btn">Update</button></form></div>);
}
