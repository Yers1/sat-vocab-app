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

create policy "public opted-in profiles are readable"
on public.profiles for select
using (leaderboard_opt_in = true or auth.uid() = user_id);

create policy "users insert their own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "users update their own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read their own vocabulary state"
on public.vocab_states for select
using (auth.uid() = user_id);

create policy "users insert their own vocabulary state"
on public.vocab_states for insert
with check (auth.uid() = user_id);

create policy "users update their own vocabulary state"
on public.vocab_states for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
