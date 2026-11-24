'use client';
import { useEffect, useState } from 'react'; import { useParams } from 'next/navigation'; import { Download, Clock, Fingerprint } from 'lucide-react'; import { api, fmtSize, fmtDate } from '@/lib/api';
export default function ShareView() {
  const { token } = useParams(), [m, setM] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api(`/s/${encodeURIComponent(token)}`).then(setM).catch((e) => setErr(e.message)); }, [token]);
  if (err) return <p className="text-red-400">{err}</p>; if (!m) return <p className="text-slate-400">Checking link…</p>;
  return (<div className="card max-w-lg space-y-3"><h1 className="text-xl font-semibold break-all">{m.name}</h1><p className="text-sm text-slate-400">{fmtSize(m.size)}</p>
    <p className="text-xs flex items-center gap-1 text-slate-400"><Clock size={12} />Expires {fmtDate(m.expiresAt)}</p><p className="text-xs flex items-center gap-1 text-slate-400 break-all"><Fingerprint size={12} />SHA-256 {m.sha256}</p>
    {m.allowDownload ? <a className="btn" href={`/api/s/${encodeURIComponent(token)}/download`}><Download size={16} />Decrypt & download</a> : <p className="text-sm text-amber-400">View-only link: download disabled by the owner.</p>}</div>);
}
