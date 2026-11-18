-- ============================================================
-- MATEOMETRO · Migración 02: el cebador también toma + arrastrar
-- Para una base que YA EXISTE (con la migración 01 ya corrida).
-- Pegá todo esto en Supabase > SQL Editor > New query > Run.
-- Se puede correr más de una vez sin problema.
-- ============================================================

-- ---------- Columna nueva ----------
alter table public.rooms add column if not exists ceb_pid uuid;

-- ---------- Crear ronda: el cebador se suma solo ----------
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

-- ---------- Acciones del cebador: no se puede sacar al cebador ----------
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

-- ---------- Funciones nuevas ----------
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
grant execute on function public.create_room(text, text, text)          to anon, authenticated;
grant execute on function public.ceb_move(uuid, text, uuid, int)         to anon, authenticated;
grant execute on function public.ceb_vote(uuid, text, boolean, boolean) to anon, authenticated;

-- ---------- Rondas abiertas que ya existen: sumar al cebador ----------
-- Entra primero en la ronda, con el primer color libre.
do $$
declare r record; v_pid uuid; v_pos int; v_color text;
begin
  for r in select * from public.rooms where not closed and ceb_pid is null loop
    select coalesce(min(position), 2) - 1 into v_pos from public.participants where room_id = r.id;
    select c into v_color
      from unnest(array['#a78bfa','#f472b6','#facc15','#38bdf8','#86efac','#fb923c',
                        '#f87171','#2dd4bf','#c084fc','#a3e635','#e879f9','#60a5fa']) with ordinality as u(c, n)
      where c not in (select color from public.participants where room_id = r.id)
      order by n limit 1;
    insert into public.participants (room_id, name, avatar, color, position)
      values (r.id, r.cebador_name, r.cebador_avatar, coalesce(v_color, '#a78bfa'), v_pos)
      returning id into v_pid;
    update public.rooms set ceb_pid = v_pid, next_id = coalesce(next_id, v_pid), version = version + 1
      where id = r.id;
  end loop;
end $$;
