-- ============================================================
-- MATEOMETRO · Migración 03: "Recibí el mate"
-- Para una base que YA EXISTE (con las migraciones 01 y 02 ya corridas).
-- Pegá todo esto en Supabase > SQL Editor > New query > Run.
-- Se puede correr más de una vez sin problema.
-- ============================================================

-- El que toma avisa que recibió el mate (lo mismo que "Pasé el mate" del cebador, pero desde el otro lado)
create or replace function public.recibi(p_pid uuid, p_token text) returns void
language plpgsql security definer set search_path = public, mt as $$
declare r rooms;
begin
  if not exists (select 1 from mt.participant_secrets where participant_id = p_pid and token = p_token) then
    raise exception 'No autorizado'; end if;
  select rm.* into r from rooms rm join participants p on p.room_id = rm.id where p.id = p_pid for update of rm;
  if r.closed then raise exception 'La ronda ya terminó: no hay mate para recibir'; end if;
  if r.state <> 'ceb' or r.next_id is distinct from p_pid then
    raise exception 'Todavía no te toca el mate'; end if;
  perform mt.halt_c(r.id);
  perform mt.run_p(p_pid);
  update participants set rounds = rounds + 1 where id = p_pid;
  update rooms set state = 'out', holder_id = p_pid, paused = false, ceb_rounds = ceb_rounds + 1,
    vote_open = case when (ceb_rounds + 1) % 10 = 0 then true else vote_open end,
    vote_n    = case when (ceb_rounds + 1) % 10 = 0 then (ceb_rounds + 1) / 10 else vote_n end,
    version   = version + 1
  where id = r.id;
end $$;

grant execute on function public.recibi(uuid, text) to anon, authenticated;
