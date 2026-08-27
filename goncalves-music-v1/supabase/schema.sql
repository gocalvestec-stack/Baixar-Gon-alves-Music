create extension if not exists pgcrypto;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  labelgrid_artist_id bigint,
  name text not null,
  slug text unique,
  bio text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  labelgrid_release_id bigint,
  labelgrid_public_id text,
  title text not null,
  content_type text not null default 'Single',
  genre text,
  secondary_genre text,
  catalog_number text,
  upc text,
  isrc text,
  release_date date,
  original_release_date date,
  explicit boolean not null default false,
  ai_disclosure boolean not null default false,
  cover_url text,
  audio_url text,
  status text not null default 'draft',
  validation_result jsonb,
  distribution_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references public.releases(id) on delete cascade,
  labelgrid_track_id bigint,
  title text not null,
  version text,
  isrc text,
  audio_url text,
  duration_seconds integer,
  contributors jsonb not null default '[]'::jsonb,
  writers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.distribution_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references public.releases(id) on delete set null,
  event text not null,
  outlet_id bigint,
  outlet_name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.royalties (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  release_id uuid references public.releases(id) on delete set null,
  period date,
  platform text,
  country text,
  streams bigint default 0,
  amount numeric(14,4) default 0,
  currency text default 'USD',
  source_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists releases_labelgrid_id_idx
  on public.releases(labelgrid_release_id);

create index if not exists tracks_release_id_idx
  on public.tracks(release_id);

create index if not exists events_release_id_idx
  on public.distribution_events(release_id);

-- Storage sugerido:
-- bucket privado: music-audio
-- bucket público ou assinado: music-covers

-- Em produção, habilite RLS e crie policies específicas para cada usuário/artista.
