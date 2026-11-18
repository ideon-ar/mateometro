-- ============================================================
-- MATEOMETRO · Migración 01: "Cerrar ronda"
-- Para una base que YA EXISTE (creada con el schema.sql anterior).
-- Pegá todo esto en Supabase > SQL Editor > New query > Run.
-- Se puede correr más de una vez sin problema.
-- ============================================================

-- ---------- Columnas nuevas ----------
alter table public.rooms add column if not exists closed    boolean not null default false;
alter table public.rooms add column if not exists closed_at timestamptz;

-- ---------- Funciones que cambian ----------
-- (create or replace mantiene los permisos que ya tenían)

-- Sumarse: rechaza rondas cerradas
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

-- Salir: en una ronda cerrada no borra a nadie (el ranking final queda intacto)
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

-- Devolví el mate: rechaza rondas cerradas
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

-- Votación: rechaza rondas cerradas
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

-- Acciones del cebador: rechaza rondas cerradas y suma la acción 'close'
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
