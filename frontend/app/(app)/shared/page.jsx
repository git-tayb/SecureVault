'use client';
import { useEffect, useState } from 'react'; import { Download } from 'lucide-react'; import { api, fmtSize, fmtDate } from '@/lib/api';
export default function Shared() {
  const [files, setFiles] = useState(null); useEffect(() => { api('/files/shared-with-me').then((r) => setFiles(r.files)); }, []);
  if (!files) return <p className="text-slate-400">Loading…</p>;
  return (<div className="space-y-4"><h1 className="text-2xl font-semibold">Shared with me</h1><div className="card overflow-x-auto">
    {files.length === 0 ? <p className="text-sm text-slate-400">Nothing shared with you yet. Links shared with you open at /s/…</p> :
      <table className="w-full text-sm"><thead><tr><th className="th">Name</th><th className="th">Owner</th><th className="th">Size</th><th className="th">Shared</th><th className="th" /></tr></thead><tbody>
        {files.map((f) => <tr key={f.id} className="border-t border-navy-700"><td className="py-2 break-all">{f.original_name}</td><td>{f.owner_name}</td><td>{fmtSize(+f.size_bytes)}</td><td>{fmtDate(f.created_at)}</td>
          <td className="text-right">{f.can_download ? <a className="btn-ghost inline-flex" href={`/api/files/${f.id}/download`}><Download size={14} /></a> : <span className="text-xs text-slate-400">view-only</span>}</td></tr>)}</tbody></table>}</div></div>);
}
