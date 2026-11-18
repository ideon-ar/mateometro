'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Art';
import { Cards, Ranking } from '@/components/Board';
import { CebPanel, MePanel, JoinForm, VoteModal, Flash } from '@/components/Panels';
import NotConfigured from '@/components/NotConfigured';
import Settings from '@/components/Settings';
import { usePrefs } from '@/lib/prefs';
import { configured, rpc } from '@/lib/supabase';
import { useRoom, useNow } from '@/lib/useRoom';
import { getSession, setSession, clearSession } from '@/lib/session';
import { ding, notify, askNotifPermission, notifSupported, unlockAudio, blinkTitle, stopBlink } from '@/lib/alerts';
import { pickColor, SLOW_MS } from '@/lib/fun';
import { turnP } from '@/lib/time';

export default function RoomPage() {
  const { code } = useParams();
  if (!configured) return <NotConfigured />;
  return <Room code={String(code).toUpperCase()} />;
}

function Room({ code }) {
  const { room, people, votes, offset, status, refresh } = useRoom(code);
  const now = useNow(offset);
  const [session, setSess] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const { sound } = usePrefs();
  const [perm, setPerm] = useState('default');
  const [voteHidden, setVoteHidden] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    setSess(getSession(code));
    setPerm(notifSupported() ? Notification.permission : 'unsupported');
    setShareUrl(`${window.location.origin}/r/${code}`);
  }, [code]);

  const isCeb = Boolean(room && session?.role === 'ceb' && session.room_id === room.id);
  const me = session?.role === 'p' && room ? people.find((p) => p.id === session.pid) : null;

  // Si me sacaron de la ronda (o la ronda se reinició con otra), limpiar la sesión
  useEffect(() => {
    if (status !== 'ok' || session?.role !== 'p' || !room) return;
    const fresh = Date.now() - (session.at || 0) < 8000;
    if (!fresh && !people.find((p) => p.id === session.pid)) {
      clearSession(code);
      setSess(null);
      setKicked(true);
    }
  }, [status, session, people, room, code]);

  // ---------- Avisos ----------
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const dismiss = useCallback(() => {
    setFlash(null);
    stopBlink();
  }, []);

  const alertAll = useCallback(({ kind, title, body, emoji, color }) => {
    if (soundRef.current) ding(kind);
    notify(`${emoji || '🧉'} ${title}`, body || '', `mateometro-${kind}`);
    setFlash({ title, body, emoji, color, at: Date.now() });
    blinkTitle(`${emoji || '🧉'} ${title}`);
  }, []);

  // Se cierra solo al rato, o con cualquier click / tecla
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(dismiss, 15000);
    const off = () => dismiss();
    const add = setTimeout(() => {
      window.addEventListener('pointerdown', off);
      window.addEventListener('keydown', off);
    }, 300);
    return () => {
      clearTimeout(t);
      clearTimeout(add);
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('keydown', off);
    };
  }, [flash, dismiss]);

  const prev = useRef(null);
  useEffect(() => {
    if (!room) return;
    const p = prev.current;
    prev.current = room;
    if (!p) return; // primera carga: no avisar nada

    // Al cebador: devolvieron el mate
    if (isCeb && room.last_return_at && room.last_return_at !== p.last_return_at) {
      const who = people.find((x) => x.id === room.last_return_by);
      const next = people.find((x) => x.id === room.next_id);
      alertAll({
        kind: 'return',
        emoji: who?.avatar || '🧉',
        title: `${room.last_return_name} devolvió el mate`,
        body: next ? `Le toca a ${next.name}` : '',
        color: who?.color,
      });
    }
    // Al que toma: te pasaron el mate
    if (me && room.holder_id === me.id && p.holder_id !== me.id) {
      alertAll({ kind: 'pass', emoji: '🧉', title: '¡Te pasaron el mate!', body: `De parte de ${room.cebador_name}`, color: me.color });
    }
    // A todos: se abrió una votación
    if (room.vote_open && (!p.vote_open || p.vote_n !== room.vote_n)) {
      setVoteHidden(false);
      if (soundRef.current) ding('vote');
      notify('🗳️ ¡Votación!', '¿Cambiamos la yerba? ¿Calentamos el agua?', 'mateometro-vote');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Más de 2:30 con el mate
  const holder = room?.state === 'out' ? people.find((x) => x.id === room.holder_id) : null;
  const slowKey = holder && turnP(holder, now) > SLOW_MS ? `${holder.id}|${holder.started_at}` : null;
  const firedSlow = useRef(new Set());
  useEffect(() => {
    if (!slowKey || firedSlow.current.has(slowKey)) return;
    firedSlow.current.add(slowKey);
    if (me && holder?.id === me.id) {
      alertAll({ kind: 'slow', emoji: '🐢', title: 'Llevás más de 2:30 con el mate', body: 'Dale que se enfría 🥶', color: '#ff4d6d' });
    } else if (isCeb && holder) {
      if (soundRef.current) ding('slow');
      notify(`🐢 ${holder.name} lleva 2:30 con el mate`, 'Andá a buscarlo 👀', 'mateometro-slow');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slowKey]);

  // ---------- Acciones ----------
  const run = async (fn) => {
    unlockAudio();
    dismiss();
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const act = (action, target = null) =>
    run(() => rpc('ceb_action', { p_room: room.id, p_token: session.token, p_action: action, p_target: target }));

  const devolvi = () => run(() => rpc('devolvi', { p_pid: session.pid, p_token: session.token }));

  const vote = (yerba, agua) =>
    run(() => rpc('vote', { p_pid: session.pid, p_token: session.token, p_yerba: yerba, p_agua: agua }));

  const leave = () => {
    if (!window.confirm('¿Salir de la ronda?')) return;
    run(async () => {
      await rpc('leave_room', { p_pid: session.pid, p_token: session.token });
      clearSession(code);
      setSess(null);
    });
  };

  const join = async ({ name, nickname, avatar }) => {
    unlockAudio();
    setBusy(true);
    setError('');
    try {
      const color = pickColor(name, people.map((p) => p.color));
      const r = await rpc('join_room', { p_code: code, p_name: name, p_nickname: nickname, p_avatar: avatar, p_color: color });
      const s = { role: 'p', room_id: r.room_id, pid: r.participant_id, token: r.token, at: Date.now() };
      setSession(code, s);
      setSess(s);
      setKicked(false);
      await refresh();
      setPerm(await askNotifPermission());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const enableNotifs = async () => {
    unlockAudio();
    const r = await askNotifPermission();
    setPerm(r);
    if (soundRef.current) ding('pass');
    if (r === 'granted') notify('🧉 Avisos activados', 'Así te enterás aunque estés en otra ventana', 'mateometro-test');
  };

  // Barra espaciadora = botón principal
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || /input|textarea/i.test(e.target.tagName) || busy || !room) return;
      if (isCeb) {
        e.preventDefault();
        if (room.state === 'idle') act('start');
        else if (room.state === 'ceb' && room.next_id) act('pass');
        else if (room.state === 'out') act('return');
      } else if (me && room.state === 'out' && room.holder_id === me.id) {
        e.preventDefault();
        devolvi();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- Render ----------
  if (status === 'loading' || (status === 'ok' && !room))
    return (
      <main className="wrap narrow">
        <Header />
        <div className="center muted">Cargando la ronda…</div>
      </main>
    );

  if (status === 'notfound' || status === 'error')
    return (
      <main className="wrap narrow">
        <Header />
        <div className="form">
          <h2>{status === 'notfound' ? `No existe la ronda ${code}` : 'No se pudo conectar'}</h2>
          <p className="sub">
            {status === 'notfound' ? 'Revisá el código con el cebador.' : 'Revisá la conexión y recargá la página.'}
          </p>
          <Link className="big as-link" href="/">
            Volver al inicio
          </Link>
        </div>
      </main>
    );

  const role = isCeb ? 'ceb' : me ? 'p' : 'viewer';

  return (
    <main className="wrap">
      <div className="topbar rise">
        <Link href="/" className="home">
          <Header small />
        </Link>
        <div className="tools">
          {perm === 'default' && (
            <button className="pill accent" onClick={enableNotifs}>
              🔔 Activar avisos
            </button>
          )}
          {perm === 'denied' && <span className="pill warn">Avisos bloqueados en el navegador</span>}
          <Settings />
        </div>
      </div>

      {error && (
        <div className="errbar" onClick={() => setError('')}>
          {error}
        </div>
      )}

      {role === 'viewer' && (
        <JoinForm
          title={`Sumarse a la ronda de ${room.cebador_name}`}
          subtitle={kicked ? 'Te sacaron de la ronda. Podés volver a sumarte.' : `Código ${room.code}`}
          cta="Sumarme a la ronda 🧉"
          defaultAvatar="🦄"
          onSubmit={join}
          busy={busy}
          error=""
        />
      )}

      {role === 'p' && (
        <div className="rise" style={{ '--i': 1 }}><MePanel room={room} me={me} people={people} now={now} onReturn={devolvi} onLeave={leave} busy={busy} /></div>
      )}

      <div className="rise" style={{ '--i': 2 }}>
        <CebPanel room={room} people={people} now={now} isCeb={isCeb} onAction={act} busy={busy} shareUrl={shareUrl} />
      </div>

      {people.length === 0 ? (
        <div className="empty rise" style={{ '--i': 3 }}>
          <div className="empty-emoji">🧉</div>
          <div>Todavía no se sumó nadie.</div>
          <div className="muted">
            Pasales este link: <b>{shareUrl}</b>
          </div>
        </div>
      ) : (
        <>
          <div className="rise" style={{ '--i': 3 }}>
            <Cards room={room} people={people} now={now} meId={me?.id} isCeb={isCeb} onAction={act} />
          </div>
          <div className="rise" style={{ '--i': 4 }}>
            <Ranking people={people} now={now} />
          </div>
        </>
      )}

      {room.vote_open && !voteHidden && (
        <VoteModal
          room={room}
          people={people}
          votes={votes}
          me={me}
          isCeb={isCeb}
          onVote={vote}
          onClose={() => act('close_vote')}
          onHide={() => setVoteHidden(true)}
        />
      )}
      {room.vote_open && voteHidden && (
        <button className="votepill" onClick={() => setVoteHidden(false)}>
          🗳️ Votación abierta
        </button>
      )}

      <Flash flash={flash} onDismiss={dismiss} />
    </main>
  );
}
