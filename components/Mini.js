'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fmt, turnP } from '@/lib/time';
import { SLOW_MS } from '@/lib/fun';
import { CebAvatar, isCebando } from './Cebando';

// Ventanita flotante "siempre encima", como el miniplayer de Spotify.
// Usa Document Picture-in-Picture (Chrome y Edge de escritorio).

const supportedNow = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window;

// Copia los estilos de la página a la ventanita (los de otro dominio, como Google Fonts, van por <link>)
function copyStyles(dst) {
  for (const ss of document.styleSheets) {
    try {
      const st = dst.createElement('style');
      st.textContent = [...ss.cssRules].map((r) => r.cssText).join('\n');
      dst.head.appendChild(st);
    } catch {
      if (ss.href) {
        const l = dst.createElement('link');
        l.rel = 'stylesheet';
        l.href = ss.href;
        dst.head.appendChild(l);
      }
    }
  }
}

export function useMiniWindow() {
  const [supported, setSupported] = useState(false);
  const [win, setWin] = useState(null);

  useEffect(() => setSupported(supportedNow()), []);

  const close = useCallback(() => {
    setWin((w) => {
      w?.close();
      return null;
    });
  }, []);

  const open = useCallback(async () => {
    if (!supportedNow()) return;
    if (window.documentPictureInPicture.window) return;
    const w = await window.documentPictureInPicture.requestWindow({ width: 340, height: 220 });
    w.document.title = 'mateometro';
    copyStyles(w.document);
    // La página tiene un ancho mínimo de 320px; la ventanita no, así se puede achicar sin que se corte
    w.document.documentElement.style.minWidth = '0';
    w.document.body.className = 'pip-body';
    // Mismo tema que la página, y que siga los cambios
    const sync = () => {
      w.document.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark';
      w.document.documentElement.dataset.motion = document.documentElement.dataset.motion || 'on';
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
    w.addEventListener('pagehide', () => {
      mo.disconnect();
      setWin(null);
    });
    setWin(w);
  }, []);

  // Si se sale de la ronda, la ventanita se cierra
  useEffect(() => () => win?.close(), [win]);

  return { supported, win, open, close, toggle: win ? close : open };
}

export function MiniButton({ mini }) {
  if (!mini.supported) return null;
  return (
    <button
      className={`iconbtn ${mini.win ? 'act' : ''}`}
      onClick={mini.toggle}
      aria-label={mini.win ? 'Cerrar ventana flotante' : 'Abrir ventana flotante'}
      title={mini.win ? 'Cerrar ventana flotante' : 'Ventana flotante (queda encima de todo)'}
    >
      <svg viewBox="0 0 24 24" className="i">
        <rect x="3" y="4" width="18" height="15" rx="2" />
        <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

const Arrow = ({ back }) => (
  <svg viewBox="0 0 24 24" className="ico">
    {back ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
  </svg>
);

// Contenido de la ventanita. Lleva su propio reloj: la ventanita está siempre visible,
// así que sigue fluida aunque la pestaña de la ronda quede en segundo plano.
export function MiniWindow({ win, room, people, votes = [], offset, isCeb, self, busy, flash, hint, onDismiss, onPrimary, onVote, onCloseVote }) {
  const [now, setNow] = useState(() => Date.now() + offset);
  const primaryRef = useRef(onPrimary);
  primaryRef.current = onPrimary;

  useEffect(() => {
    let raf;
    let last = 0;
    const tick = (t) => {
      if (t - last > 90) {
        last = t;
        setNow(Date.now() + offset);
      }
      raf = win.requestAnimationFrame(tick);
    };
    raf = win.requestAnimationFrame(tick);
    return () => win.cancelAnimationFrame(raf);
  }, [win, offset]);

  // Barra espaciadora y efecto ripple también dentro de la ventanita
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && !(e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM')) return;
      e.preventDefault();
      primaryRef.current?.();
    };
    const onDown = (e) => {
      const el = e.target.closest?.('button:not(:disabled)');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const s = win.document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    };
    win.addEventListener('keydown', onKey);
    win.addEventListener('pointerdown', onDown);
    return () => {
      win.removeEventListener('keydown', onKey);
      win.removeEventListener('pointerdown', onDown);
    };
  }, [win]);

  const by = (id) => people.find((p) => p.id === id);
  const holder = room.state === 'out' ? by(room.holder_id) : null;
  const next = by(room.next_id);
  const mine = holder && self && holder.id === self.id;
  const turn = holder ? turnP(holder, now) : room.ceb_started_at ? Math.max(0, now - Date.parse(room.ceb_started_at)) : 0;
  const slow = holder && turn > SLOW_MS;

  // Qué se muestra
  let who = null;
  let line;
  let label;
  if (room.closed) {
    line = 'La ronda terminó';
  } else if (room.state === 'idle') {
    line = 'Todavía no arrancó la ronda';
  } else if (holder) {
    who = holder;
    line = mine ? '¡Tenés el mate!' : `Lo tiene ${holder.name}`;
    label = 'Este mate';
  } else {
    // Mientras se ceba se ve el cuadradito del cebador con la animación
    who = { avatar: room.cebador_avatar, color: by(room.ceb_pid)?.color, ceb: true };
    line = next ? (self && next.id === self.id ? 'Te toca a vos' : `Le toca a ${next.name}`) : 'Esperando gente…';
    label = room.paused ? 'Cebando (en pausa)' : 'Cebando…';
  }

  // Botón principal (el mismo que la barra espaciadora)
  let btn = null;
  if (!room.closed && isCeb) {
    if (room.state === 'idle') btn = { text: 'Arrancar a cebar' };
    else if (room.state === 'ceb')
      btn = {
        text: next && next.id === room.ceb_pid ? 'Me sirvo un mate' : next ? `Pasé el mate a ${next.name}` : 'Esperando gente…',
        icon: <Arrow />,
        disabled: !next,
      };
    else btn = { text: mine ? 'Listo, ya tomé' : `${holder?.name || 'Lo'} devolvió el mate`, icon: <Arrow back />, ret: true };
  } else if (!room.closed && self && room.state === 'ceb' && next?.id === self.id) {
    btn = { text: 'Recibí el mate', icon: <Arrow /> };
  } else if (!room.closed && self) {
    btn = { text: 'Devolví el mate', icon: mine ? <Arrow back /> : null, ret: mine, disabled: !mine };
  }

  // Votación cada 10 mates (versión compacta)
  const voting = room.vote_open && !room.closed;
  const myVote = votes.find((v) => v.participant_id === self?.id);
  const tally = (k, val) => votes.filter((v) => v[k] === val).length;
  const setVote = (k, val) => {
    const nv = { yerba: myVote?.yerba ?? null, agua: myVote?.agua ?? null, [k]: val };
    onVote?.(nv.yerba, nv.agua);
  };

  const cls = ['pip', holder && 'holding', mine && 'mine', slow && 'slow', flash && 'alert', voting && 'voting'].filter(Boolean).join(' ');
  const t = fmt(turn);

  return createPortal(
    <div className={cls} style={{ '--c': who?.color || 'var(--a1)' }} onClick={flash ? onDismiss : undefined}>
      <div className="pip-top">
        <span className="pip-brand">🧉 mateometro · {room.code}</span>
        {room.paused && <span className="paused">En pausa</span>}
        {!room.paused && room.state !== 'idle' && !room.closed && <span>Ronda {room.round}</span>}
      </div>
      {flash ? (
        <div className="pip-alert">
          <span className="pip-av">{flash.emoji || '🧉'}</span>
          <b>{flash.title}</b>
        </div>
      ) : voting ? (
        <div className="pip-vote">
          <div className="pip-vote-head">
            <b>🗳️ ¡Ya van {room.vote_n * 10} mates!</b>
            <span>
              Votaron {votes.length} de {people.length}
              {isCeb && (
                <>
                  {' · '}
                  <button className="link" onClick={onCloseVote}>
                    Cerrar
                  </button>
                </>
              )}
            </span>
          </div>
          {[
            ['yerba', '🌿 ¿Yerba nueva?'],
            ['agua', '🔥 ¿Calentar agua?'],
          ].map(([k, q]) => (
            <div className="pip-q" key={k}>
              <span>{q}</span>
              <button disabled={!self} className={myVote?.[k] === true ? 'sel si' : ''} onClick={() => setVote(k, true)}>
                Sí <b>{tally(k, true)}</b>
              </button>
              <button disabled={!self} className={myVote?.[k] === false ? 'sel no' : ''} onClick={() => setVote(k, false)}>
                No <b>{tally(k, false)}</b>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="pip-main">
          {who &&
            (who.ceb ? (
              <CebAvatar avatar={who.avatar} cebando={isCebando(room)} className="pip-av" />
            ) : (
              <span className="pip-av">{who.avatar}</span>
            ))}
          <div className="pip-info">
            <div className="pip-line">{line}</div>
            {label && <div className="pip-lbl">{label}</div>}
          </div>
          {!room.closed && room.state !== 'idle' && (
            <div className="pip-time">
              {t.main}
              <span className="cs">{t.cs}</span>
            </div>
          )}
          {/* Botón redondo, para cuando la ventanita es muy chica */}
          {btn && (
            <button
              className={`pip-quick ${btn.ret ? 'ret' : ''}`}
              disabled={busy || btn.disabled}
              aria-label={btn.text}
              title={btn.text}
              onClick={(e) => {
                e.stopPropagation();
                onPrimary?.();
              }}
            >
              {btn.icon || <Arrow />}
            </button>
          )}
        </div>
      )}
      {hint && <div className="pip-hint">{hint}</div>}
      {btn && (
        <button
          className={`big ${btn.ret ? 'ret' : ''}`}
          disabled={busy || btn.disabled}
          onClick={(e) => {
            e.stopPropagation();
            onPrimary?.();
          }}
        >
          {btn.icon}
          {btn.text}
        </button>
      )}
    </div>,
    win.document.body,
  );
}
