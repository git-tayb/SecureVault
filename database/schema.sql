create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  email text not null unique check (email = lower(email)),
  password_hash text not null,                       -- Argon2id, never plaintext
  role text not null default 'user' check (role in ('user','admin')),
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text not null unique,
  sha256_plain char(64) not null,                    -- integrity of original
  sha256_cipher char(64) not null,                   -- integrity of stored blob
  iv bytea not null, auth_tag bytea not null,        -- AES-GCM params for file
  wrapped_dek bytea not null, dek_iv bytea not null, dek_tag bytea not null, -- per-file key wrapped by master key
  created_at timestamptz not null default now()
);
create index on files(owner_id);

create table shared_links (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique,               -- SHA-256 of token; raw token never stored
  expires_at timestamptz not null,
  allow_download boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table file_permissions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  grantee_id uuid not null references users(id) on delete cascade,
  granted_by uuid not null references users(id) on delete cascade,
  can_download boolean not null default true,
  created_at timestamptz not null default now(),
  unique (file_id, grantee_id)
);

create table activity_logs (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  action text not null,
  file_id uuid,                                      -- no FK: logs outlive deleted files
  ip text, user_agent text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on activity_logs(user_id, created_at desc);

-- Deny Supabase's public REST API entirely: only the backend's direct DB connection is used.
alter table users enable row level security;
alter table files enable row level security;
alter table shared_links enable row level security;
alter table file_permissions enable row level security;
alter table activity_logs enable row level security;

-- Create the PRIVATE bucket (or do it in the dashboard with "Public" OFF)
insert into storage.buckets (id, name, public) values ('encrypted-files','encrypted-files', false) on conflict (id) do update set public=false;
-- Promote an admin manually:  update users set role='admin' where email='you@example.com';
