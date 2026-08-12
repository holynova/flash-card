create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  timezone text not null default 'Asia/Shanghai',
  default_new_cards_per_day integer not null default 10 check (default_new_cards_per_day between 0 and 200),
  default_retention double precision not null default 0.90 check (default_retention between 0.70 and 0.97),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  new_cards_per_day integer not null default 10 check (new_cards_per_day between 0 and 200),
  desired_retention double precision not null default 0.90 check (desired_retention between 0.70 and 0.97),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  filename text not null check (char_length(filename) <= 255),
  status text not null default 'processing' check (status in ('processing', 'complete', 'failed', 'reverted')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  error_summary text,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  front text not null check (char_length(trim(front)) between 1 and 10000),
  back text not null default '' check (char_length(back) <= 10000),
  state text not null default 'new' check (state in ('new', 'learning', 'review', 'relearning')),
  due_at timestamptz not null default now(),
  stability double precision,
  difficulty double precision,
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  elapsed_days integer not null default 0 check (elapsed_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  last_reviewed_at timestamptz,
  is_suspended boolean not null default false,
  version integer not null default 0 check (version >= 0),
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  reviewed_at timestamptz not null,
  duration_ms integer not null default 0 check (duration_ms between 0 and 86400000),
  previous_card jsonb not null,
  resulting_card jsonb not null,
  undone_at timestamptz,
  created_at timestamptz not null default now()
);

create index decks_user_id_idx on public.decks(user_id);
create index cards_user_id_idx on public.cards(user_id);
create index cards_deck_due_idx on public.cards(deck_id, due_at) where is_suspended = false;
create index cards_import_job_idx on public.cards(import_job_id) where import_job_id is not null;
create index review_logs_user_reviewed_idx on public.review_logs(user_id, reviewed_at desc);
create index review_logs_card_idx on public.review_logs(card_id, reviewed_at desc);
create index import_jobs_user_idx on public.import_jobs(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger decks_set_updated_at before update on public.decks
for each row execute function public.set_updated_at();
create trigger cards_set_updated_at before update on public.cards
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.import_jobs enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy decks_select_own on public.decks
for select to authenticated
using ((select auth.uid()) = user_id);
create policy decks_insert_own on public.decks
for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy decks_update_own on public.decks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy decks_delete_own on public.decks
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy import_jobs_select_own on public.import_jobs
for select to authenticated
using ((select auth.uid()) = user_id);
create policy import_jobs_insert_own on public.import_jobs
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = (select auth.uid()))
);
create policy import_jobs_update_own on public.import_jobs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy import_jobs_delete_own on public.import_jobs
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy cards_select_own on public.cards
for select to authenticated
using ((select auth.uid()) = user_id);
create policy cards_insert_own on public.cards
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = (select auth.uid()))
);
create policy cards_update_own on public.cards
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = (select auth.uid()))
);
create policy cards_delete_own on public.cards
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy review_logs_select_own on public.review_logs
for select to authenticated
using ((select auth.uid()) = user_id);
create policy review_logs_insert_own on public.review_logs
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.cards c where c.id = card_id and c.user_id = (select auth.uid()))
);
create policy review_logs_update_own on public.review_logs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert, update on public.review_logs to authenticated;
grant select, insert, update, delete on public.import_jobs to authenticated;

create or replace function public.commit_review_transition(
  event_id uuid,
  card_id_input uuid,
  rating_input smallint,
  reviewed_at_input timestamptz,
  duration_ms_input integer,
  expected_version_input integer,
  resulting_state_input text,
  due_at_input timestamptz,
  stability_input double precision,
  difficulty_input double precision,
  scheduled_days_input integer,
  elapsed_days_input integer,
  repetitions_input integer,
  lapses_input integer
)
returns public.review_logs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_log public.review_logs;
  current_card public.cards;
  updated_card public.cards;
  output_log public.review_logs;
begin
  select * into existing_log from public.review_logs where id = event_id;
  if found then return existing_log; end if;

  select * into current_card
  from public.cards
  where id = card_id_input and user_id = (select auth.uid())
  for update;

  if not found then raise exception 'card_not_found'; end if;
  if current_card.version <> expected_version_input then raise exception 'card_version_conflict'; end if;
  if rating_input < 1 or rating_input > 4 then raise exception 'invalid_rating'; end if;
  if resulting_state_input not in ('new', 'learning', 'review', 'relearning') then raise exception 'invalid_state'; end if;

  update public.cards set
    state = resulting_state_input,
    due_at = due_at_input,
    stability = stability_input,
    difficulty = difficulty_input,
    scheduled_days = scheduled_days_input,
    elapsed_days = elapsed_days_input,
    repetitions = repetitions_input,
    lapses = lapses_input,
    last_reviewed_at = reviewed_at_input,
    version = version + 1,
    updated_at = reviewed_at_input
  where id = current_card.id
  returning * into updated_card;

  insert into public.review_logs (
    id, user_id, card_id, deck_id, rating, reviewed_at, duration_ms, previous_card, resulting_card
  ) values (
    event_id, current_card.user_id, current_card.id, current_card.deck_id, rating_input,
    reviewed_at_input, duration_ms_input, to_jsonb(current_card), to_jsonb(updated_card)
  ) returning * into output_log;

  return output_log;
end;
$$;

revoke all on function public.commit_review_transition(uuid, uuid, smallint, timestamptz, integer, integer, text, timestamptz, double precision, double precision, integer, integer, integer, integer) from public;
grant execute on function public.commit_review_transition(uuid, uuid, smallint, timestamptz, integer, integer, text, timestamptz, double precision, double precision, integer, integer, integer, integer) to authenticated;

create or replace function public.undo_last_review()
returns public.cards
language plpgsql
security invoker
set search_path = ''
as $$
declare
  latest_log public.review_logs;
  restored public.cards;
begin
  select * into latest_log
  from public.review_logs
  where user_id = (select auth.uid()) and undone_at is null
  order by reviewed_at desc
  limit 1
  for update;

  if not found then return null; end if;

  update public.cards set
    state = latest_log.previous_card->>'state',
    due_at = (latest_log.previous_card->>'due_at')::timestamptz,
    stability = (latest_log.previous_card->>'stability')::double precision,
    difficulty = (latest_log.previous_card->>'difficulty')::double precision,
    scheduled_days = (latest_log.previous_card->>'scheduled_days')::integer,
    elapsed_days = (latest_log.previous_card->>'elapsed_days')::integer,
    repetitions = (latest_log.previous_card->>'repetitions')::integer,
    lapses = (latest_log.previous_card->>'lapses')::integer,
    last_reviewed_at = (latest_log.previous_card->>'last_reviewed_at')::timestamptz,
    version = (latest_log.previous_card->>'version')::integer,
    updated_at = now()
  where id = latest_log.card_id and user_id = (select auth.uid())
  returning * into restored;

  update public.review_logs set undone_at = now() where id = latest_log.id;
  return restored;
end;
$$;

revoke all on function public.undo_last_review() from public;
grant execute on function public.undo_last_review() to authenticated;
