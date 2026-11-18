-- ============================================================
-- MATEOMETRO ONLINE · Esquema de Supabase
-- Pegá todo esto en Supabase > SQL Editor > New query > Run
-- ============================================================

create schema if not exists mt;            -- funciones internas (no expuestas por la API)

-- ---------- Tablas ----------
create table if not exists public.rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  cebador_name     text not null,
  cebador_avatar   text not null default '🧉',
  state            text not null default 'idle' check (state in ('idle','ceb','out')),
  paused           boolean not null default false,
  holder_id        uuid,
  next_id          uuid,
  round            int not null default 1,
  ceb_acc_ms       bigint not null default 0,
  ceb_started_at   timestamptz,
  ceb_rounds       int not null default 0,
  last_return_by   uuid,
  last_return_name text,
  last_return_at   timestamptz,
  vote_open        boolean not null default false,
  vote_n           int not null default 0,
  version          bigint not null default 0,
  closed           boolean not null default false,
  closed_at        timestamptz,
  ceb_pid          uuid,          -- el cebador también toma: es una persona más de la ronda
  created_at       timestamptz not null default now()
);
-- Para bases creadas antes de "Cerrar ronda"
alter table public.rooms add column if not exists closed    boolean not null default false;
alter table public.rooms add column if not exists closed_at timestamptz;
-- Para bases creadas antes de que el cebador tome
alter table public.rooms add column if not exists ceb_pid   uuid;

create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  name        text not null,
  nickname    text,
  avatar      text not null default '🙂',
  color       text not null,
  position    int not null,
  acc_ms      bigint not null default 0,
  started_at  timestamptz,
  rounds      int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists participants_room_pos on public.participants(room_id, position);

create table if not exists public.votes (
  room_id        uuid not null references public.rooms(id) on delete cascade,
  n              int not null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  yerba          boolean,
  agua           boolean,
  primary key (room_id, n, participant_id)
);

-- Tokens secretos (nadie los puede leer desde la API)
create table if not exists mt.room_secrets (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  token   text not null
);
create table if not exists mt.participant_secrets (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  token          text not null
);

-- ---------- Seguridad: todos leen, nadie escribe directo ----------
alter table public.rooms        enable row level security;
alter table public.participants enable row level security;
alter table public.votes        enable row level security;

drop policy if exists "leer rooms" on public.rooms;
drop policy if exists "leer participants" on public.participants;
drop policy if exists "leer votes" on public.votes;
create policy "leer rooms"        on public.rooms        for select to anon, authenticated using (true);
create policy "leer participants" on public.participants for select to anon, authenticated using (true);
create policy "leer votes"        on public.votes        for select to anon, authenticated using (true);

-- ---------- Tiempo real ----------
do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; end $$;

-- ---------- Helpers internos ----------
create or replace function mt.ms(t timestamptz) returns bigint language sql stable as
$$ select coalesce((extract(epoch from (now() - t)) * 1000)::bigint, 0) $$;

create or replace function mt.tok() returns text language sql volatile as
$$ select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') $$;

create or replace function mt.halt_p(p uuid) returns void language sql as
$$ update public.participants set acc_ms = acc_ms + mt.ms(started_at), started_at = null
   where id = p and started_at is not null $$;

create or replace function mt.run_p(p uuid) returns void language sql as
$$ update public.participants set started_at = now() where id = p and started_at is null $$;

create or replace function mt.halt_c(r uuid) returns void language sql as
$$ update public.rooms set ceb_acc_ms = ceb_acc_ms + mt.ms(ceb_started_at), ceb_started_at = null
   where id = r and ceb_started_at is not null $$;

create or replace function mt.run_c(r uuid) returns void language sql as
$$ update public.rooms set ceb_started_at = now() where id = r and ceb_started_at is null $$;

create or replace function mt.next_after(r uuid, p uuid) returns uuid language sql stable as
$$ select coalesce(
     (select id from public.participants
       where room_id = r and position > (select position from public.participants where id = p)
       order by position limit 1),
     (select id from public.participants where room_id = r order by position limit 1)) $$;

-- Devolver el mate: frena al que lo tiene, corre el cebador, avanza el turno
create or replace function mt.do_return(r_id uuid, p_alert boolean) returns void
language plpgsql as $$
declare r public.rooms; h public.participants; nxt uuid; npos int;
begin
  select * into r from public.rooms where id = r_id for update;
  if r.state <> 'out' then return; end if;
  select * into h from public.participants where id = r.holder_id;
  perform mt.halt_p(r.holder_id);
  nxt := mt.next_after(r_id, r.holder_id);
  select position into npos from public.participants where id = nxt;
  update public.rooms set
    state = 'ceb', holder_id = null, next_id = nxt, paused = false,
    round = round + case when h.id is not null and npos <= h.position then 1 else 0 end,
    last_return_by   = case when p_alert then h.id   else last_return_by end,
    last_return_name = case when p_alert then h.name else last_return_name end,
    last_return_at   = case when p_alert then now()  else last_return_at end
  where id = r_id;
  perform mt.run_c(r_id);
end $$;

create or replace function mt.remove_participant(r_id uuid, p uuid) returns void
language plpgsql as $$
declare r public.rooms; nxt uuid;
begin
  select * into r from public.rooms where id = r_id;
  if r.holder_id = p then
    perform mt.do_return(r_id, false);
    select * into r from public.rooms where id = r_id;
  end if;
  if r.next_id = p then
    nxt := mt.next_after(r_id, p);
    update public.rooms set next_id = case when nxt = p then null else nxt end where id = r_id;
  end if;
  delete from public.participants where id = p and room_id = r_id;
end $$;

-- ---------- API pública (RPC) ----------
create or replace function public.server_now() returns timestamptz language sql stable as $$ select now() $$;

-- Crear la ronda: el cebador se suma solo como una persona más (también toma)
drop function if exists public.create_room(text, text);
create or replace function public.create_room(p_name text, p_avatar text default '🧉', p_color text default null) returns json
language plpgsql security definer set search_path = public, mt as $$
declare v_code text; v_id uuid; v_tok text; v_pid uuid; i int;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Falta el nombre'; end if;
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = v_code);
  end loop;
  insert into rooms (code, cebador_name, cebador_avatar)
    values (v_code, left(trim(p_name), 24), left(coalesce(nullif(p_avatar, ''), '🧉'), 8))
    returning id into v_id;
  v_tok := mt.tok();
  insert into mt.room_secrets values (v_id, v_tok);
  insert into participants (room_id, name, avatar, color, position)
    values (v_id, left(trim(p_name), 24), left(coalesce(nullif(p_avatar, ''), '🧉'), 8),
            case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#a78bfa' end, 1)
    returning id into v_pid;
  update rooms set ceb_pid = v_pid, next_id = v_pid where id = v_id;
  return json_build_object('room_id', v_id, 'code', v_code, 'token', v_tok, 'participant_id', v_pid);
end $$;

create or replace function public.join_room(p_code text, p_name text, p_nickname text, p_avatar text, p_color text) returns json
language plpgsql security definer set search_path = public, mt as $$
declare r rooms; v_pid uuid; v_tok text; v_pos int;
begin
  select * into r from rooms where code = upper(trim(p_code));
  if not found then raise exception 'No existe esa ronda'; end if;
  if r.closed then raise exception 'Esta ronda ya terminó. Pedile al cebador que arme una nueva.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Falta el nombre'; end if;
  if (select count(*) from participants where room_id = r.id) >= 12 then raise exception 'La ronda está llena'; end if;
  select coalesce(max(position), 0) + 1 into v_pos from participants where room_id = r.id;
  insert into participants (room_id, name, nickname, avatar, color, position)
    values (r.id, left(trim(p_name), 24), left(nullif(trim(coalesce(p_nickname, '')), ''), 40),
            left(coalesce(nullif(p_avatar, ''), '🙂'), 8),
            case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#a3e635' end, v_pos)
    returning id into v_pid;
  v_tok := mt.tok();
  insert into mt.participant_secrets values (v_pid, v_tok);
  update rooms set next_id = coalesce(next_id, v_pid), version = version + 1 where id = r.id;
  return json_build_object('room_id', r.id, 'participant_id', v_pid, 'token', v_tok);
end $$;

create or replace function public.leave_room(p_pid uuid, p_token text) returns void
language plpgsql security definer set search_path = public, mt as $$
declare v_room uuid;
begin
  if not exists (select 1 from mt.participant_secrets where participant_id = p_pid and token = p_token) then
    raise exception 'No autorizado'; end if;
  select room_id into v_room from participants where id = p_pid;
  -- En una ronda cerrada no se borra a nadie, así el ranking final queda intacto
  if exists (select 1 from rooms where id = v_room and closed) then return; end if;
  perform mt.remove_participant(v_room, p_pid);
  update rooms set version = version + 1 where id = v_room;
end $$;

-- El que toma avisa que devolvió el mate
create or replace function public.devolvi(p_pid uuid, p_token text) returns void
language plpgsql security definer set search_path = public, mt as $$
declare v_room uuid;
begin
  if not exists (select 1 from mt.participant_secrets where participant_id = p_pid and token = p_token) then
    raise exception 'No autorizado'; end if;
  select room_id into v_room from participants where id = p_pid;
  if exists (select 1 from rooms where id = v_room and closed) then
    raise exception 'La ronda ya terminó: no hay mate para devolver'; end if;
  if not exists (select 1 from rooms where id = v_room and state = 'out' and holder_id = p_pid) then
    raise exception 'No tenés el mate'; end if;
  perform mt.do_return(v_room, true);
  update rooms set version = version + 1 where id = v_room;
end $$;

-- Votación (yerba / agua)
create or replace function public.vote(p_pid uuid, p_token text, p_yerba boolean, p_agua boolean) returns void
language plpgsql security definer set search_path = public, mt as $$
declare r rooms;
begin
  if not exists (select 1 from mt.participant_secrets where participant_id = p_pid and token = p_token) then
    raise exception 'No autorizado'; end if;
  select rm.* into r from rooms rm join participants p on p.room_id = rm.id where p.id = p_pid;
  if r.closed then raise exception 'La ronda ya terminó: la votación está cerrada'; end if;
  if not r.vote_open then raise exception 'No hay votación abierta'; end if;
  insert into votes (room_id, n, participant_id, yerba, agua) values (r.id, r.vote_n, p_pid, p_yerba, p_agua)
  on conflict (room_id, n, participant_id) do update set yerba = excluded.yerba, agua = excluded.agua;
  update rooms set version = version + 1 where id = r.id;
end $$;

-- Acciones del cebador
create or replace function public.ceb_action(p_room uuid, p_token text, p_action text, p_target uuid default null) returns void
language plpgsql security definer set search_path = public, mt as $$
declare r rooms; a participants; b participants; nxt uuid;
begin
  if not exists (select 1 from mt.room_secrets where room_id = p_room and token = p_token) then
    raise exception 'Solo el cebador puede hacer esto'; end if;
  select * into r from rooms where id = p_room for update;
  if r.closed then raise exception 'La ronda ya está cerrada: no se puede hacer nada más'; end if;

  case p_action
  when 'start' then
    if r.state = 'idle' then
      update rooms set state = 'ceb', paused = false,
        next_id = coalesce(next_id, (select id from participants where room_id = p_room order by position limit 1))
      where id = p_room;
      perform mt.run_c(p_room);
    end if;

  when 'pass' then
    if r.state = 'ceb' and r.next_id is not null then
      perform mt.halt_c(p_room);
      perform mt.run_p(r.next_id);
      update participants set rounds = rounds + 1 where id = r.next_id;
      update rooms set state = 'out', holder_id = r.next_id, paused = false, ceb_rounds = ceb_rounds + 1,
        vote_open = case when (ceb_rounds + 1) % 10 = 0 then true else vote_open end,
        vote_n    = case when (ceb_rounds + 1) % 10 = 0 then (ceb_rounds + 1) / 10 else vote_n end
      where id = p_room;
    end if;

  when 'return' then
    perform mt.do_return(p_room, false);

  when 'skip' then
    if r.state = 'out' then
      perform mt.do_return(p_room, false);
    elsif r.next_id is not null then
      nxt := mt.next_after(p_room, r.next_id);
      update rooms set next_id = nxt,
        round = round + case when (select position from participants where id = nxt)
                               <= (select position from participants where id = r.next_id) then 1 else 0 end
      where id = p_room;
    end if;

  when 'pause' then
    if r.state <> 'idle' and not r.paused then
      perform mt.halt_c(p_room);
      update participants set acc_ms = acc_ms + mt.ms(started_at), started_at = null
        where room_id = p_room and started_at is not null;
      update rooms set paused = true where id = p_room;
    end if;

  when 'resume' then
    if r.paused then
      if r.state = 'out' then perform mt.run_p(r.holder_id); else perform mt.run_c(p_room); end if;
      update rooms set paused = false where id = p_room;
    end if;

  when 'reset' then
    update participants set acc_ms = 0, started_at = null, rounds = 0 where room_id = p_room;
    delete from votes where room_id = p_room;
    update rooms set state = 'idle', paused = false, holder_id = null, round = 1,
      ceb_acc_ms = 0, ceb_started_at = null, ceb_rounds = 0, vote_open = false, vote_n = 0,
      next_id = (select id from participants where room_id = p_room order by position limit 1)
    where id = p_room;

  when 'set_next' then
    if r.state <> 'out' and exists (select 1 from participants where id = p_target and room_id = p_room) then
      update rooms set next_id = p_target where id = p_room;
    end if;

  when 'up', 'down' then
    select * into a from participants where id = p_target and room_id = p_room;
    if a.id is not null then
      if p_action = 'up' then
        select * into b from participants where room_id = p_room and position < a.position order by position desc limit 1;
      else
        select * into b from participants where room_id = p_room and position > a.position order by position limit 1;
      end if;
      if b.id is not null then
        update participants set position = b.position where id = a.id;
        update participants set position = a.position where id = b.id;
      end if;
      if r.state = 'idle' then  -- antes de arrancar, el primero de la lista es el que sigue
        update rooms set next_id = (select id from participants where room_id = p_room order by position limit 1)
        where id = p_room;
      end if;
    end if;

  when 'kick' then
    if p_target = r.ceb_pid then raise exception 'Al cebador no se lo puede sacar de la ronda'; end if;
    perform mt.remove_participant(p_room, p_target);

  when 'close_vote' then
    update rooms set vote_open = false where id = p_room;

  when 'open_vote' then
    update rooms set vote_open = true, vote_n = vote_n + 1 where id = p_room;

  when 'close' then
    -- Frena todos los cronómetros sumando lo que llevaban corrido, y cierra la ronda
    perform mt.halt_c(p_room);
    update participants set acc_ms = acc_ms + mt.ms(started_at), started_at = null
      where room_id = p_room and started_at is not null;
    update rooms set closed = true, closed_at = now(), state = 'idle',
      holder_id = null, paused = false, vote_open = false
    where id = p_room;

  else
    raise exception 'Acción desconocida: %', p_action;
  end case;

  update rooms set version = version + 1 where id = p_room;
end $$;

-- Ordenar la ronda arrastrando: pone a p_pid en el lugar p_index (0 = primero)
create or replace function public.ceb_move(p_room uuid, p_token text, p_pid uuid, p_index int) returns void
language plpgsql security definer set search_path = public, mt as $$
declare r rooms; ids uuid[]; k int;
begin
  if not exists (select 1 from mt.room_secrets where room_id = p_room and token = p_token) then
    raise exception 'Solo el cebador puede hacer esto'; end if;
  select * into r from rooms where id = p_room for update;
  if r.closed then raise exception 'La ronda ya está cerrada: no se puede hacer nada más'; end if;
  if not exists (select 1 from participants where id = p_pid and room_id = p_room) then
    raise exception 'Esa persona ya no está en la ronda'; end if;
  select coalesce(array_agg(id order by position), '{}') into ids from participants where room_id = p_room and id <> p_pid;
  k := greatest(0, least(coalesce(p_index, 0), coalesce(array_length(ids, 1), 0)));
  ids := ids[1:k] || p_pid || ids[k + 1:];
  update participants p set position = x.n from unnest(ids) with ordinality as x(id, n) where p.id = x.id;
  if r.state = 'idle' then  -- antes de arrancar, el primero de la lista es el que sigue
    update rooms set next_id = ids[1] where id = p_room;
  end if;
  update rooms set version = version + 1 where id = p_room;
end $$;

-- El cebador también vota (yerba / agua)
create or replace function public.ceb_vote(p_room uuid, p_token text, p_yerba boolean, p_agua boolean) returns void
language plpgsql security definer set search_path = public, mt as $$
declare r rooms;
begin
  if not exists (select 1 from mt.room_secrets where room_id = p_room and token = p_token) then
    raise exception 'Solo el cebador puede hacer esto'; end if;
  select * into r from rooms where id = p_room;
  if r.closed then raise exception 'La ronda ya terminó: la votación está cerrada'; end if;
  if r.ceb_pid is null then raise exception 'El cebador no está en la ronda'; end if;
  if not r.vote_open then raise exception 'No hay votación abierta'; end if;
  insert into votes (room_id, n, participant_id, yerba, agua) values (r.id, r.vote_n, r.ceb_pid, p_yerba, p_agua)
  on conflict (room_id, n, participant_id) do update set yerba = excluded.yerba, agua = excluded.agua;
  update rooms set version = version + 1 where id = r.id;
end $$;

-- ---------- Permisos ----------
revoke all on schema mt from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.rooms, public.participants, public.votes to anon, authenticated;
revoke insert, update, delete on public.rooms, public.participants, public.votes from anon, authenticated;
grant execute on function public.server_now()                                      to anon, authenticated;
grant execute on function public.create_room(text, text, text)                     to anon, authenticated;
grant execute on function public.join_room(text, text, text, text, text)           to anon, authenticated;
grant execute on function public.leave_room(uuid, text)                            to anon, authenticated;
grant execute on function public.devolvi(uuid, text)                               to anon, authenticated;
grant execute on function public.vote(uuid, text, boolean, boolean)                to anon, authenticated;
grant execute on function public.ceb_action(uuid, text, text, uuid)                to anon, authenticated;
grant execute on function public.ceb_move(uuid, text, uuid, int)                    to anon, authenticated;
grant execute on function public.ceb_vote(uuid, text, boolean, boolean)            to anon, authenticated;
