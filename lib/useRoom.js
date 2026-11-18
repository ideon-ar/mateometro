'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

// Carga la ronda + participantes + votos y se mantiene sincronizado en tiempo real
export function useRoom(code) {
  const [room, setRoom] = useState(null);
  const [people, setPeople] = useState([]);
  const [votes, setVotes] = useState([]);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
  const roomId = useRef(null);
  const busy = useRef(false);
  const again = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      const { data: r, error } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).maybeSingle();
      if (error) throw error;
      if (!r) {
        setStatus('notfound');
        return;
      }
      roomId.current = r.id;
      const [{ data: ps }, { data: vs }] = await Promise.all([
        supabase.from('participants').select('*').eq('room_id', r.id).order('position'),
        supabase.from('votes').select('*').eq('room_id', r.id).eq('n', r.vote_n),
      ]);
      setRoom(r);
      setPeople(ps || []);
      setVotes(vs || []);
      setStatus('ok');
    } catch (e) {
      console.error(e);
      setStatus((s) => (s === 'ok' ? 'ok' : 'error'));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        refresh();
      }
    }
  }, [code]);

  // Diferencia de reloj con el servidor, para que todos vean el mismo tiempo
  useEffect(() => {
    (async () => {
      const t0 = Date.now();
      const { data } = await supabase.rpc('server_now');
      const t1 = Date.now();
      if (data) setOffset(Date.parse(data) - (t0 + t1) / 2);
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: cada acción incrementa rooms.version, así que con escuchar la fila alcanza
  useEffect(() => {
    if (status !== 'ok' || !roomId.current) return;
    const ch = supabase
      .channel(`room-${roomId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId.current}` }, () =>
        refresh(),
      )
      .subscribe();
    const poll = setInterval(refresh, 5000); // red de seguridad
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [status, refresh]);

  return { room, people, votes, offset, status, refresh };
}

// Reloj que se actualiza cada frame (ajustado al servidor)
export function useNow(offset) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    let raf;
    const tick = () => {
      setNow(Date.now() + offset);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Si la pestaña está en segundo plano, rAF se frena: igual seguimos con un intervalo
    const iv = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, [offset]);
  return now;
}
