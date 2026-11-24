'use client';
import { useState } from 'react'; import Link from 'next/link'; import { useRouter } from 'next/navigation'; import { ShieldCheck } from 'lucide-react'; import { api } from '@/lib/api';
export default function AuthForm({ mode }) {
  const reg = mode === 'register', router = useRouter(), [f, setF] = useState({ name: '', email: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const rules = [[/.{12,}/, '12+ characters'], [/[a-z]/, 'lowercase'], [/[A-Z]/, 'uppercase'], [/\d/, 'digit'], [/[^A-Za-z0-9]/, 'symbol']];
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      if (reg) await api('/auth/login', { method: 'POST', body: { email: f.email, password: f.password } });
      const n = new URLSearchParams(location.search).get('next'); router.replace(n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="min-h-screen grid place-items-center p-4"><form onSubmit={submit} className="card w-full max-w-sm space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="text-blue-400" />{reg ? 'Create account' : 'Sign in'}</div>
      {reg && <input className="input" placeholder="Full name" value={f.name} onChange={set('name')} required />}
      <input className="input" type="email" placeholder="Email" value={f.email} onChange={set('email')} required autoComplete="email" />
      <input className="input" type="password" placeholder="Password" value={f.password} onChange={set('password')} required autoComplete={reg ? 'new-password' : 'current-password'} />
      {reg && <ul className="flex flex-wrap gap-1.5 text-xs">{rules.map(([r, l]) => <li key={l} className={`px-2 py-0.5 rounded-full ${r.test(f.password) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-navy-800 text-slate-400'}`}>{l}</li>)}</ul>}
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <button className="btn w-full justify-center" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Register' : 'Login'}</button>
      <p className="text-sm text-slate-400">{reg ? 'Have an account? ' : 'No account? '}<Link className="text-blue-400" href={reg ? '/login' : '/register'}>{reg ? 'Login' : 'Register'}</Link></p>
    </form></div>);
}
