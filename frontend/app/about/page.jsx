import Link from 'next/link';
const P = [['Confidentiality', 'AES-256-GCM envelope encryption; private storage bucket; keys never leave the server.'], ['Integrity', 'GCM auth tags plus SHA-256 hashes of plaintext and ciphertext, verified on download.'], ['Authentication', 'Argon2id passwords, lockout and rate limits, JWT in HttpOnly SameSite=Strict cookies.'], ['Authorization', 'RBAC (user/admin) and per-file ownership, ACL and link checks on the server.'], ['Availability', 'Rate limiting, size limits, graceful error handling.'], ['Accountability', 'Activity log of logins, uploads, downloads, shares, denials and deletions.']];
export default function About() {
  return (<div className="max-w-3xl mx-auto p-6"><Link href="/" className="text-blue-400 text-sm">← Home</Link><h1 className="text-3xl font-bold my-4">About SecureVault</h1>
    <div className="space-y-3">{P.map(([t, d]) => <div key={t} className="card"><h3 className="font-semibold text-blue-300">{t}</h3><p className="text-sm text-slate-300 mt-1">{d}</p></div>)}</div></div>);
}
