-- Supabase SQL Editor에서 한 번 실행하세요.
-- 공개 사용자는 랭킹 조회와 새 기록 제출만 할 수 있고, 수정/삭제는 허용하지 않습니다.

create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 10),
  score integer not null check (score between 1 and 99999),
  mode text not null default '랭킹전' check (mode in ('랭킹전', '놀이')),
  created_at timestamptz not null default now()
);

alter table public.rankings enable row level security;

grant select, insert on public.rankings to anon;

drop policy if exists "Anyone can read rankings" on public.rankings;
create policy "Anyone can read rankings"
on public.rankings
for select
to anon
using (true);

drop policy if exists "Anyone can submit a ranking" on public.rankings;
create policy "Anyone can submit a ranking"
on public.rankings
for insert
to anon
with check (
  char_length(name) between 1 and 10
  and score between 1 and 99999
  and mode in ('랭킹전', '놀이')
);

create index if not exists rankings_score_created_idx
on public.rankings (score desc, created_at asc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rankings'
  ) then
    alter publication supabase_realtime add table public.rankings;
  end if;
end $$;
