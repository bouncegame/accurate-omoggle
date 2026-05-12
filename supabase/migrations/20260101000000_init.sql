-- AccurateOmoggle: initial schema
-- Auth: relies on built-in Supabase auth.users
-- Profiles, matchmaking queue, match history

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    handle          text unique not null check (char_length(handle) between 3 and 20 and handle ~ '^[a-z0-9_]+$'),
    display_name    text not null check (char_length(display_name) between 1 and 40),
    bio             text default '' check (char_length(bio) <= 240),
    avatar_url      text,
    best_score      numeric(4,2) default 0 check (best_score >= 0 and best_score <= 10),
    mogx            integer not null default 0 check (mogx >= 0),
    wins            integer not null default 0 check (wins >= 0),
    losses          integer not null default 0 check (losses >= 0),
    draws           integer not null default 0 check (draws >= 0),
    matches_played  integer not null default 0 check (matches_played >= 0),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists profiles_mogx_idx on public.profiles (mogx desc);
create index if not exists profiles_handle_idx on public.profiles (handle);

-- ---------------------------------------------------------------------------
-- matchmaking_queue
-- A single row per user actively searching for a match.
-- ---------------------------------------------------------------------------
create table if not exists public.matchmaking_queue (
    user_id         uuid primary key references auth.users(id) on delete cascade,
    handle          text not null,
    joined_at       timestamptz not null default now(),
    channel         text not null,           -- realtime channel used for signaling
    is_initiator    boolean not null default false,
    paired_with     uuid references auth.users(id) on delete set null
);

create index if not exists matchmaking_queue_joined_at_idx on public.matchmaking_queue (joined_at);
create index if not exists matchmaking_queue_paired_with_idx on public.matchmaking_queue (paired_with);

-- ---------------------------------------------------------------------------
-- matches: record of each completed (or abandoned) 1v1
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
    id              uuid primary key default gen_random_uuid(),
    a_user_id       uuid not null references auth.users(id) on delete cascade,
    b_user_id       uuid references auth.users(id) on delete set null,
    a_score         numeric(4,2),
    b_score         numeric(4,2),
    winner          text check (winner in ('a','b','draw','abandoned')),
    mogx_delta_a    integer not null default 0,
    mogx_delta_b    integer not null default 0,
    duration_ms     integer not null default 0,
    created_at      timestamptz not null default now()
);

create index if not exists matches_a_user_idx on public.matches (a_user_id, created_at desc);
create index if not exists matches_b_user_idx on public.matches (b_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- automatic profile bootstrap on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    base_handle text;
    final_handle text;
    counter integer := 0;
begin
    base_handle := lower(regexp_replace(
        coalesce(new.raw_user_meta_data ->> 'handle',
                 split_part(new.email, '@', 1),
                 'mogger'),
        '[^a-z0-9_]', '', 'g'
    ));
    if char_length(base_handle) < 3 then
        base_handle := 'mogger' || substr(replace(new.id::text, '-', ''), 1, 6);
    end if;
    if char_length(base_handle) > 16 then
        base_handle := substr(base_handle, 1, 16);
    end if;

    final_handle := base_handle;
    while exists(select 1 from public.profiles where handle = final_handle) loop
        counter := counter + 1;
        final_handle := base_handle || counter::text;
    end loop;

    insert into public.profiles (id, handle, display_name)
    values (
        new.id,
        final_handle,
        coalesce(new.raw_user_meta_data ->> 'display_name', final_handle)
    );

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.matches enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
    for select to authenticated, anon
    using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
    for update to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
    for insert to authenticated
    with check (auth.uid() = id);

-- matchmaking_queue: users can read everything in the queue (needed for pairing)
-- but can only insert/update/delete their own row.
drop policy if exists "queue_select_all" on public.matchmaking_queue;
create policy "queue_select_all" on public.matchmaking_queue
    for select to authenticated
    using (true);

drop policy if exists "queue_insert_own" on public.matchmaking_queue;
create policy "queue_insert_own" on public.matchmaking_queue
    for insert to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "queue_update_own_or_pairing" on public.matchmaking_queue;
create policy "queue_update_own_or_pairing" on public.matchmaking_queue
    for update to authenticated
    using (auth.uid() = user_id or auth.uid() = paired_with)
    with check (auth.uid() = user_id or auth.uid() = paired_with);

drop policy if exists "queue_delete_own" on public.matchmaking_queue;
create policy "queue_delete_own" on public.matchmaking_queue
    for delete to authenticated
    using (auth.uid() = user_id);

-- matches
drop policy if exists "matches_select_participants" on public.matches;
create policy "matches_select_participants" on public.matches
    for select to authenticated
    using (auth.uid() = a_user_id or auth.uid() = b_user_id);

drop policy if exists "matches_insert_participant" on public.matches;
create policy "matches_insert_participant" on public.matches
    for insert to authenticated
    with check (auth.uid() = a_user_id or auth.uid() = b_user_id);

-- ---------------------------------------------------------------------------
-- realtime: publish queue + profiles + matches so the client can subscribe
-- ---------------------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_publication where pubname = 'supabase_realtime'
    ) then
        create publication supabase_realtime;
    end if;
end$$;

alter publication supabase_realtime add table public.matchmaking_queue;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.matches;

-- ---------------------------------------------------------------------------
-- atomic matchmaker RPC
-- claim_match_partner(p_channel text, p_user_id uuid, p_handle text)
--   - looks for the oldest waiting peer in the queue (not paired)
--   - if found: pairs us together (we become initiator), returns peer info
--   - if none: inserts our row and returns null partner
-- ---------------------------------------------------------------------------
create or replace function public.claim_match_partner(p_channel text)
returns table(partner_id uuid, partner_handle text, channel text, is_initiator boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
    me uuid := auth.uid();
    my_handle text;
    peer record;
begin
    if me is null then
        raise exception 'not authenticated';
    end if;

    select p.handle into my_handle from public.profiles p where p.id = me;
    if my_handle is null then
        raise exception 'no profile for user %', me;
    end if;

    -- garbage collect stale entries (> 60s old, unpaired)
    delete from public.matchmaking_queue
    where joined_at < now() - interval '60 seconds'
      and paired_with is null;

    -- try to find an existing waiting peer
    select q.* into peer
    from public.matchmaking_queue q
    where q.user_id <> me
      and q.paired_with is null
    order by q.joined_at asc
    for update skip locked
    limit 1;

    if peer.user_id is not null then
        -- pair us with the existing peer; we become initiator (peer responds)
        update public.matchmaking_queue
        set paired_with = me
        where user_id = peer.user_id;

        insert into public.matchmaking_queue (user_id, handle, joined_at, channel, is_initiator, paired_with)
        values (me, my_handle, now(), peer.channel, true, peer.user_id)
        on conflict (user_id) do update
        set handle = excluded.handle,
            joined_at = excluded.joined_at,
            channel = excluded.channel,
            is_initiator = excluded.is_initiator,
            paired_with = excluded.paired_with;

        return query select peer.user_id, peer.handle, peer.channel, true;
    else
        -- no peer; enter the queue as waiter
        insert into public.matchmaking_queue (user_id, handle, joined_at, channel, is_initiator, paired_with)
        values (me, my_handle, now(), p_channel, false, null)
        on conflict (user_id) do update
        set handle = excluded.handle,
            joined_at = now(),
            channel = excluded.channel,
            is_initiator = false,
            paired_with = null;

        return query select null::uuid, null::text, p_channel, false;
    end if;
end;
$$;

grant execute on function public.claim_match_partner(text) to authenticated;

-- leave queue helper
create or replace function public.leave_matchmaking_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    me uuid := auth.uid();
begin
    if me is null then
        raise exception 'not authenticated';
    end if;
    delete from public.matchmaking_queue where user_id = me;
end;
$$;

grant execute on function public.leave_matchmaking_queue() to authenticated;

-- award_match_result RPC -- called by both clients after match ends
-- idempotent on (a_user_id, b_user_id, round-bucket) effectively but simpler:
-- we just insert one match record per "winner-side" caller and update profile stats.
create or replace function public.award_match_result(
    p_opponent_id uuid,
    p_my_score numeric,
    p_opp_score numeric,
    p_duration_ms integer
)
returns table(mogx_delta integer, new_mogx integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    me uuid := auth.uid();
    diff numeric;
    mog_d integer;
    winner_code text;
    new_mogx integer;
begin
    if me is null then
        raise exception 'not authenticated';
    end if;
    if p_opponent_id is null then
        raise exception 'no opponent';
    end if;

    p_my_score := greatest(0, least(10, p_my_score));
    p_opp_score := greatest(0, least(10, p_opp_score));
    diff := p_my_score - p_opp_score;

    if diff > 0.05 then
        winner_code := 'a';
        -- bigger diff = more mogx. base 25 + 15*diff. capped.
        mog_d := least(150, greatest(10, floor(25 + 15 * diff)::int));
    elsif diff < -0.05 then
        winner_code := 'b';
        -- losing still earns participation
        mog_d := 5;
    else
        winner_code := 'draw';
        mog_d := 10;
    end if;

    insert into public.matches (a_user_id, b_user_id, a_score, b_score, winner, mogx_delta_a, mogx_delta_b, duration_ms)
    values (me, p_opponent_id, p_my_score, p_opp_score, winner_code, mog_d, 0, p_duration_ms);

    update public.profiles
    set mogx = mogx + mog_d,
        wins = wins + (case when winner_code = 'a' then 1 else 0 end),
        losses = losses + (case when winner_code = 'b' then 1 else 0 end),
        draws = draws + (case when winner_code = 'draw' then 1 else 0 end),
        matches_played = matches_played + 1,
        best_score = greatest(best_score, p_my_score)
    where id = me
    returning mogx into new_mogx;

    return query select mog_d, new_mogx;
end;
$$;

grant execute on function public.award_match_result(uuid, numeric, numeric, integer) to authenticated;
