# SecureVault — Secure File Sharing System

Next.js + Tailwind frontend · Express REST API · Supabase PostgreSQL + private Storage.

## Setup
1. **Supabase**: create a project. In SQL Editor run `database/schema.sql` (creates tables, enables RLS, creates the *private* `encrypted-files` bucket).
2. **Backend**: `cd backend && npm install && cp ../.env.example .env`, fill values (generate `JWT_SECRET` and `MASTER_KEY` with the commands in the file), then `npm run dev` (port 4000).
3. **Frontend**: `cd frontend && npm install`, create `.env.local` with `BACKEND_URL=http://localhost:4000`, then `npm run dev` (port 3000).
4. Register at http://localhost:3000/register. Make an admin: `update users set role='admin' where email='you@example.com';`

## Deployment
Backend on Render/Railway/Fly (set env vars, `NODE_ENV=production`, `TRUST_PROXY=1`); frontend on Vercel with `BACKEND_URL` pointing to the API. HTTPS is mandatory in production (cookies are `Secure`). Keep the frontend and API behind the same site via the Next.js rewrite.

## How each security feature works
| Principle | Implementation | Where |
|---|---|---|
| Confidentiality | **Envelope encryption.** Each file gets a random 256-bit key (DEK); file is encrypted with AES-256-GCM; DEK is wrapped by a master key (`MASTER_KEY`, server env only, never in frontend). Only ciphertext reaches the private bucket. Fresh random 96-bit nonce per encryption; a DEK is used once, so no (key, nonce) reuse. AAD binds ciphertext to the file ID (can't swap blobs between files). | `lib/crypto.js` |
| Integrity | GCM auth tag + SHA-256 of plaintext and ciphertext, checked on every download. Failure → HTTP 409 + `INTEGRITY_FAILURE` log. | `lib/crypto.js`, `lib/access.js` |
| Authentication | Argon2id hashes; strong-password policy; 5 failed logins → 15-min lock; 10 auth requests/15 min/IP; dummy hash on unknown email (timing) and generic errors (no user enumeration); JWT (HS256, 1 h) in HttpOnly, Secure, SameSite=Strict cookie. | `routes/auth.js`, `middleware/security.js` |
| Authorization | RBAC (`user`/`admin`) + file-level checks (owner / ACL / link token) on every request. Non-owners get 404 (no existence leak). Admins can see audit metadata but **cannot decrypt others' files**. | `lib/access.js`, `routes/*` |
| Sharing | 256-bit random link token, only its SHA-256 stored; expiry; revoke; optional view-only; recipients must be logged in. | `routes/shares.js` |
| Availability | Global + auth + upload rate limits, 10 MB cap, request body limits, central error handler. | `app.js`, `routes/files.js` |
| Accountability | `activity_logs`: login ok/fail/lock, upload, download, share, revoke, denied, delete, integrity failure. No secrets in logs. | `lib/log.js` |
| Attack protection | Parameterized SQL (SQLi), React escaping + Helmet headers (XSS), SameSite + double-submit token (CSRF), magic-byte + allow-list validation, sanitized filenames, storage keys are UUIDs, RLS denies Supabase public API. | everywhere |

## Test checklist (for your report/demo)
- Open the `.enc` object in Supabase Storage: unreadable ciphertext.
- Edit the stored object / DB hash → download returns 409 and logs `INTEGRITY_FAILURE`.
- Log in as user B and request user A's file ID → 404 + `ACCESS_DENIED`.
- Create a 1-hour link, revoke it → 404. Create view-only link → download 403.
- 6 wrong passwords → lock. POST without `x-csrf-token` → 403. Upload `.exe` renamed `.pdf` → 415.

## Known limitations (be upfront in your report)
- Master key lives in an env var; production should use a KMS (AWS KMS / Vault) and support key rotation.
- Files are encrypted/decrypted in server memory (10 MB cap); large files would need streaming/chunked GCM.
- JWTs are not individually revocable before 1 h expiry (user row is re-checked each request).
- Not yet run end-to-end against a live Supabase project, so do a first-run pass.
