'use client';
import { useEffect, useState } from 'react'; import Link from 'next/link'; import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, Upload, Files, Share2, Activity, Settings, LogOut, Menu } from 'lucide-react';
import { api } from '@/lib/api';
const nav = [['/dashboard', 'Dashboard', LayoutDashboard], ['/upload', 'Upload', Upload], ['/files', 'My Files', Files], ['/shared', 'Shared Files', Share2], ['/activity', 'Security Activity', Activity], ['/settings', 'Settings', Settings]];
export default function Shell({ children }) {
  const [user, setUser] = useState(null), [open, setOpen] = useState(false), path = usePathname(), router = useRouter();
  useEffect(() => { api('/auth/me').then((r) => setUser(r.user)).catch(() => router.replace('/login?next=' + encodeURIComponent(path))); }, []);
  if (!user) return <div className="min-h-screen grid place-items-center text-slate-400">Verifying session…</div>;
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); router.replace('/login'); };
  return (
    <div className="min-h-screen md:flex">
      <header className="md:hidden flex items-center justify-between p-3 bg-navy-900 border-b border-navy-700">
        <span className="flex items-center gap-2 font-semibold"><ShieldCheck className="text-blue-400" />SecureVault</span>
        <button onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} md:flex md:flex-col w-full md:w-60 md:min-h-screen bg-navy-900 border-r border-navy-700 p-4`}>
        <div className="hidden md:flex items-center gap-2 font-semibold text-lg mb-6"><ShieldCheck className="text-blue-400" />SecureVault</div>
        <nav className="space-y-1 flex-1">{nav.map(([h, l, I]) => (
          <Link key={h} href={h} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${path === h ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-navy-800 text-slate-300'}`}><I size={18} />{l}</Link>))}</nav>
        <div className="border-t border-navy-700 pt-3 text-xs text-slate-400"><div className="truncate">{user.name} · {user.role}</div>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-slate-300 hover:text-white text-sm"><LogOut size={16} />Logout</button></div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full">{children}</main>
    </div>);
}
