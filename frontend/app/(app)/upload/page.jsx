'use client';
import { useState } from 'react'; import { Lock } from 'lucide-react'; import Link from 'next/link';
export default function Upload() {
  const [pct, setPct] = useState(0), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const send = (e) => {
    e.preventDefault(); const file = e.target.file.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file); setBusy(true); setMsg(null); setPct(0);
    const x = new XMLHttpRequest(); x.open('POST', '/api/files'); x.setRequestHeader('x-csrf-token', document.cookie.split('; ').find((c) => c.startsWith('csrf='))?.slice(5) || '');
    x.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
    x.onload = () => { setBusy(false); let j = {}; try { j = JSON.parse(x.responseText); } catch {} setMsg(x.status === 201 ? { ok: true, t: `Encrypted & stored. SHA-256: ${j.sha256}` } : { t: j.error || 'Upload failed' }); };
    x.onerror = () => { setBusy(false); setMsg({ t: 'Network error' }); }; x.send(fd);
  };
  return (<div className="space-y-4 max-w-xl"><h1 className="text-2xl font-semibold">Upload file</h1>
    <form onSubmit={send} className="card space-y-4">
      <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx" className="input" required />
      <p className="text-xs text-slate-400">Allowed: PDF, PNG, JPG, TXT, DOCX · max 10 MB · validated by extension, MIME type and file signature on the server.</p>
      <button className="btn" disabled={busy}><Lock size={16} />{busy ? 'Uploading…' : 'Encrypt & upload'}</button>
      {(busy || pct > 0) && <div className="h-2 bg-navy-800 rounded"><div className="h-2 bg-blue-500 rounded transition-all" style={{ width: pct + '%' }} /></div>}
      {msg && <p role="alert" className={`text-sm break-all ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.t} {msg.ok && <Link href="/files" className="underline">View files</Link>}</p>}
    </form></div>);
}
