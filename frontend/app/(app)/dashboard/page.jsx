'use client';
import { useEffect, useState } from 'react'; import { api, fmtSize, fmtDate } from '@/lib/api';
export default function Dash() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/dashboard').then(setD); }, []);
  if (!d) return <p className="text-slate-400">Loading…</p>;
  const s = d.stats, cards = [['Files', s.files], ['Storage used', fmtSize(+s.bytes)], ['Shared with me', s.shared_with_me], ['Active links', s.active_links], ['Security alerts (7d)', s.alerts]];
  return (<div className="space-y-6"><h1 className="text-2xl font-semibold">Dashboard</h1>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{cards.map(([l, v]) => <div key={l} className="card"><div className="text-xs text-slate-400">{l}</div><div className="text-2xl font-semibold mt-1">{v}</div></div>)}</div>
    <div className="card"><h2 className="font-medium mb-3">Recent activity</h2><ul className="divide-y divide-navy-700 text-sm">{d.recent.map((r) => <li key={r.id} className="py-2 flex justify-between gap-2"><span>{r.action}</span><span className="text-slate-400">{fmtDate(r.created_at)}</span></li>)}</ul></div></div>);
}
