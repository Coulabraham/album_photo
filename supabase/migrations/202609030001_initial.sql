create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  bucket_name text not null check (bucket_name in ('webcam-private', 'album-public')),
  filename text not null,
  media_type text not null check (media_type in ('image', 'video')),
  title varchar(150) not null,
  description text,
  memory_date date,
  source text not null check (source in ('webcam', 'upload')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint published_location check (not is_published or bucket_name = 'album-public')
);

create index if not exists photos_published_idx on public.photos (is_published);
create index if not exists photos_source_idx on public.photos (source);
create index if not exists photos_media_type_idx on public.photos (media_type);
create index if not exists photos_memory_date_idx on public.photos (memory_date);
create index if not exists photos_created_at_idx on public.photos (created_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.photos enable row level security;

drop policy if exists "users read their profile" on public.profiles;
create policy "users read their profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "published memories are public" on public.photos;
create policy "published memories are public"
  on public.photos for select to anon, authenticated
  using (is_published = true);

drop policy if exists "admins read every memory" on public.photos;
create policy "admins read every memory"
  on public.photos for select to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.role = 'admin'
  ));

grant usage on schema public to anon, authenticated;
grant select on public.photos to anon, authenticated;
grant select on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('album-public', 'album-public', true, 41943040, array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime','video/x-m4v']),
  ('webcam-private', 'webcam-private', false, 8388608, array['image/jpeg','video/webm','video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads album objects" on storage.objects;
create policy "public reads album objects"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'album-public');

drop policy if exists "admins read private captures" on storage.objects;
create policy "admins read private captures"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'webcam-private'
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );
