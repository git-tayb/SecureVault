import Link from 'next/link'; import { ShieldCheck, Lock, Fingerprint, KeyRound, ScrollText, Link2 } from 'lucide-react';
const F = [[Lock, 'AES-256-GCM encryption', 'Every file is encrypted server-side before it reaches storage.'], [Fingerprint, 'SHA-256 integrity', 'Tampering is detected on every download.'], [KeyRound, 'Argon2id + secure cookies', 'Hardened authentication and session handling.'], [Link2, 'Expiring share links', 'Unpredictable, revocable, time-limited access.'], [ScrollText, 'Full audit trail', 'Every sensitive action is logged.'], [ShieldCheck, 'RBAC + file ACLs', 'Authorization enforced on every request.']];
export default function Home() {
  return (<div className="max-w-5xl mx-auto p-6">
    <nav className="flex items-center justify-between py-4"><span className="flex items-center gap-2 font-semibold"><ShieldCheck className="text-blue-400" />SecureVault</span>
      <div className="flex gap-3 text-sm items-center"><Link href="/about">About</Link><Link href="/login">Login</Link><Link className="btn" href="/register">Get started</Link></div></nav>
    <section className="py-16 text-center"><h1 className="text-4xl md:text-5xl font-bold">Share files. <span className="text-blue-400">Keep control.</span></h1>
      <p className="mt-4 text-slate-400 max-w-xl mx-auto">An Information Security project demonstrating confidentiality, integrity, authentication, authorization, availability and accountability.</p></section>
    <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{F.map(([I, t, d]) => <div key={t} className="card"><I className="text-blue-400 mb-2" /><h3 className="font-medium">{t}</h3><p className="text-sm text-slate-400 mt-1">{d}</p></div>)}</section></div>);
}
