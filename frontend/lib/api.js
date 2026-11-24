const csrf = () => document.cookie.split('; ').find((c) => c.startsWith('csrf='))?.slice(5);
export async function api(path, { method = 'GET', body, form } = {}) {
  const o = { method, credentials: 'include', headers: {} };
  if (method !== 'GET') { if (!csrf()) await fetch('/api/csrf', { credentials: 'include' }); o.headers['x-csrf-token'] = csrf(); }
  if (form) o.body = form; else if (body) { o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(body); }
  const r = await fetch('/api' + path, o);
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) { const e = new Error(j?.error || 'Request failed'); e.status = r.status; throw e; }
  return j;
}
export const fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
export const fmtDate = (d) => new Date(d).toLocaleString();
