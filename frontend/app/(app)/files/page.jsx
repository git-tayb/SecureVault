'use client';
import { Fragment, useEffect, useState } from 'react'; import { Download, Share2, Trash2, Lock, Copy, X } from 'lucide-react'; import { api, fmtSize, fmtDate } from '@/lib/api';
function SharePanel({ file }) {
  const [s, setS] = useState({ links: [], users: [] }), [hrs, setHrs] = useState(24), [dl, setDl] = useState(true), [email, setEmail] = useState(''), [url, setUrl] = useState(''), [err, setErr] = useState('');
  const load = () => api(`/files/${file.id}/shares`).then(setS); useEffect(() => { load(); }, []);
  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  return (<div className="bg-navy-950 border border-navy-700 rounded-lg p-4 mt-2 space-y-4 text-sm">
    <div className="flex flex-wrap gap-2 items-center"><select className="input w-auto" value={hrs} onChange={(e) => setHrs(+e.target.value)}>{[[1, '1 hour'], [24, '24 hours'], [168, '7 days'], [720, '30 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <label className="flex items-center gap-1"><input type="checkbox" checked={dl} onChange={(e) => setDl(e.target.checked)} />Allow download</label>
      <button className="btn" onClick={() => run(async () => { const r = await api(`/files/${file.id}/link`, { method: 'POST', body: { expiresInHours: hrs, allowDownload: dl } }); const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
setUrl(`${appUrl}/s/${r.token}`); })}>Create link</button></div>
    {url && <div className="flex gap-2 items-center"><input readOnly className="input" value={url} /><button className="btn-ghost" onClick={() => navigator.clipboard.writeText(url)}><Copy size={14} /></button></div>}
    {url && <p className="text-xs text-amber-400">Copy now — this link is not shown again. Recipients must log in.</p>}
    <div className="flex gap-2"><input className="input" placeholder="Share with user (email)" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn-ghost" onClick={() => run(() => api(`/files/${file.id}/user`, { method: 'POST', body: { email, canDownload: dl } }).then(() => setEmail('')))}>Share</button></div>
    {err && <p className="text-red-400">{err}</p>}
    <ul className="space-y-1">{s.links.map((l) => <li key={l.id} className="flex justify-between items-center"><span>Link · {l.revoked_at ? 'revoked' : new Date(l.expires_at) < new Date() ? 'expired' : 'expires ' + fmtDate(l.expires_at)} · {l.allow_download ? 'download' : 'view-only'}</span>
      {!l.revoked_at && <button className="btn-ghost" onClick={() => run(() => api(`/links/${l.id}`, { method: 'DELETE' }))}><X size={14} />Revoke</button>}</li>)}
      {s.users.map((u) => <li key={u.id} className="flex justify-between items-center"><span>User · {u.email} · {u.can_download ? 'download' : 'view-only'}</span><button className="btn-ghost" onClick={() => run(() => api(`/permissions/${u.id}`, { method: 'DELETE' }))}><X size={14} />Revoke</button></li>)}</ul></div>);
}
export default function Files() {
  const [files, setFiles] = useState(null), [open, setOpen] = useState(null), [err, setErr] = useState('');
  const load = () => api('/files').then((r) => setFiles(r.files)); useEffect(() => { load(); }, []);
  const del = async (f) => { if (!confirm(`Delete ${f.original_name}? This cannot be undone.`)) return; try { await api(`/files/${f.id}`, { method: 'DELETE' }); load(); } catch (e) { setErr(e.message); } };
  if (!files) return <p className="text-slate-400">Loading…</p>;
  return (<div className="space-y-4"><h1 className="text-2xl font-semibold">My Files</h1>{err && <p className="text-red-400">{err}</p>}
    <div className="card overflow-x-auto">{files.length === 0 ? <p className="text-slate-400 text-sm">No files yet.</p> :
      <table className="w-full text-sm"><thead><tr><th className="th">Name</th><th className="th">Size</th><th className="th hidden sm:table-cell">Uploaded</th><th className="th">Status</th><th className="th" /></tr></thead><tbody>
        {files.map((f) => (<Fragment key={f.id}><tr className="border-t border-navy-700"><td className="py-2 pr-2 break-all">{f.original_name}</td><td>{fmtSize(+f.size_bytes)}</td><td className="hidden sm:table-cell">{fmtDate(f.created_at)}</td>
          <td><span className="badge"><Lock size={12} />AES-256-GCM</span></td>
          <td className="text-right whitespace-nowrap space-x-1"><a className="btn-ghost" href={`/api/files/${f.id}/download`}><Download size={14} /></a><button className="btn-ghost" onClick={() => setOpen(open === f.id ? null : f.id)}><Share2 size={14} />{f.shares > 0 && f.shares}</button><button className="btn-ghost text-red-400" onClick={() => del(f)}><Trash2 size={14} /></button></td></tr>
          {open === f.id && <tr key={f.id + 's'}><td colSpan={5}><SharePanel file={f} /></td></tr>}</Fragment>))}</tbody></table>}</div></div>);
}
