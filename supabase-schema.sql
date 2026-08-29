-- Run this whole file in the Supabase SQL editor. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Per-account profile + full state backup (used by optional email sign-in)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 32),
  bio text not null default '' check (char_length(bio) <= 140),
  leaderboard_opt_in boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  total_reviews integer not null default 0 check (total_reviews >= 0),
  mastered integer not null default 0 check (mastered >= 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocab_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.vocab_states enable row level security;

drop policy if exists "public opted-in profiles are readable" on public.profiles;
create policy "public opted-in profiles are readable"
on public.profiles for select
using (leaderboard_opt_in = true or auth.uid() = user_id);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users read their own vocabulary state" on public.vocab_states;
create policy "users read their own vocabulary state"
on public.vocab_states for select
using (auth.uid() = user_id);

drop policy if exists "users insert their own vocabulary state" on public.vocab_states;
create policy "users insert their own vocabulary state"
on public.vocab_states for insert
with check (auth.uid() = user_id);

drop policy if exists "users update their own vocabulary state" on public.vocab_states;
create policy "users update their own vocabulary state"
on public.vocab_states for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Friend groups + shared leaderboard
-- ---------------------------------------------------------------------------
-- One row per group. The `code` is the shared secret embedded in the invite link.
create table if not exists public.study_groups (
  code text primary key,
  name text not null default 'Study group' check (char_length(name) <= 40),
  created_at timestamptz not null default now()
);

-- One row per person per group, holding the numbers the leaderboard ranks by.
create table if not exists public.group_members (
  code text not null references public.study_groups(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'SAT learner' check (char_length(username) <= 32),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  mastered integer not null default 0 check (mastered >= 0),
  words_learned integer not null default 0 check (words_learned >= 0),
  new_today integer not null default 0 check (new_today >= 0),
  updated_at timestamptz not null default now(),
  primary key (code, user_id)
);

alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;

-- Anyone signed in can look up a group by code (needed to join) and create one.
drop policy if exists "groups are readable" on public.study_groups;
create policy "groups are readable" on public.study_groups for select using (true);

drop policy if exists "signed-in users create groups" on public.study_groups;
create policy "signed-in users create groups" on public.study_groups for insert
  with check (auth.uid() is not null);

-- Each person only ever reads/writes their own membership row.
drop policy if exists "read own membership" on public.group_members;
create policy "read own membership" on public.group_members for select
  using (auth.uid() = user_id);

drop policy if exists "join a group" on public.group_members;
create policy "join a group" on public.group_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own membership" on public.group_members;
create policy "update own membership" on public.group_members for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leave a group" on public.group_members;
create policy "leave a group" on public.group_members for delete
  using (auth.uid() = user_id);

-- The leaderboard read goes through this function so members can see each other
-- without a recursive row-level-security policy. The group code is the gate.
create or replace function public.group_board(p_code text)
returns table (
  username text, xp integer, streak integer,
  mastered integer, words_learned integer, new_today integer, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select username, xp, streak, mastered, words_learned, new_today, updated_at
  from public.group_members
  where code = p_code
  order by xp desc, mastered desc, words_learned desc
  limit 100;
$$;
grant execute on function public.group_board(text) to anon, authenticated;
