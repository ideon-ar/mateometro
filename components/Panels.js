'use client';
import { useState } from 'react';
import { Ring, Time, Ranking } from './Board';
import { elapsedC, elapsedP, turnP, fmt } from '@/lib/time';
import { AVATARS, randomNickname, SLOW_MS, slowMessage } from '@/lib/fun';

const Arrow = ({ back }) => (
  <svg viewBox="0 0 24 24" className="ico">
    {back ? (
      <>
        <path d="M19 12H5" />
        <path d="M11 6l-6 6 6 6" />
      </>
    ) : (
      <>
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </>
    )}
  </svg>
);

function rondaText(room, people) {
  const by = (id) => people.find((p) => p.id === id);
  if (room.state === 'idle') return <>Todavía no arrancó la ronda</>;
  if (room.state === 'out')
    return (
      <>
        Ronda <b>{room.round}</b> · Lo tiene <b>{by(room.holder_id)?.name || '—'}</b>
      </>
    );
  const n = by(room.next_id);
  return (
    <>
      Ronda <b>{room.round}</b> · {n ? <>Le toca a <b>{n.name}</b></> : 'Esperando que se sume alguien'}
    </>
  );
}

// Panel del cebador: lo ven todos, pero solo el cebador tiene los botones
export function CebPanel({ room, people, now, isCeb, onAction, busy, shareUrl }) {
  const [copied, setCopied] = useState(false);
  const ms = elapsedC(room, now);
  const next = people.find((p) => p.id === room.next_id);
  const holder = people.find((p) => p.id === room.holder_id);
  const on = Boolean(room.ceb_started_at);

  let main = null;
  if (isCeb) {
    if (room.state === 'idle')
      main = (
        <button className="big" disabled={busy} onClick={() => onAction('start')}>
          Arrancar a cebar
        </button>
      );
    else if (room.state === 'ceb')
      main = (
        <button className="big" disabled={busy || !next} onClick={() => onAction('pass')}>
          <Arrow />
          {next ? `Pasé el mate a ${next.name}` : 'Esperando gente…'}
        </button>
      );
    else
      main = (
        <button className="big ret" disabled={busy} onClick={() => onAction('return')}>
          <Arrow back />
          {holder ? `${holder.name} devolvió el mate` : 'Devolvieron el mate'}
        </button>
      );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={`ceb ${on ? 'on' : ''} ${isCeb ? '' : 'viewer'}`}>
      <Ring ms={ms}>
        <Time ms={ms} />
      </Ring>
      <div className="cinfo">
        <div className="who">
          <span className="av">{room.cebador_avatar}</span>
          <div>
            <div className="name">
              {room.cebador_name}
              {isCeb && <span className="you">vos</span>}
            </div>
            <div className="nick">Cebador</div>
          </div>
        </div>
        <div className="stats">
          <span>
            Cebados <b>{room.ceb_rounds}</b>
          </span>
          {room.paused && <span className="paused">En pausa</span>}
        </div>
        <div className="ronda">{rondaText(room, people)}</div>
        <button className="share" onClick={copy} title="Copiar link para sumarse">
          Código <b>{room.code}</b> · {copied ? '¡Link copiado!' : 'Copiar link'}
        </button>
      </div>
      {isCeb && (
        <div className="actions">
          {main}
          <div className="mini">
            <button disabled={busy || room.state === 'idle'} onClick={() => onAction('skip')}>
              Saltear
            </button>
            <button disabled={busy || room.state === 'idle'} onClick={() => onAction(room.paused ? 'resume' : 'pause')}>
              {room.paused ? 'Seguir' : 'Pausar'}
            </button>
            <button
              disabled={busy}
              onClick={() => window.confirm('¿Reiniciar todos los tiempos?') && onAction('reset')}
            >
              Reiniciar
            </button>
          </div>
          <div className="hint">Tip: tocá una tarjeta para elegir quién sigue · ◀ ▶ para ordenar la ronda</div>
        </div>
      )}
    </div>
  );
}

// Panel propio del participante, con el botón grande de "Devolví el mate"
export function MePanel({ room, me, people, now, onReturn, busy }) {
  const holding = room.holder_id === me.id && room.state === 'out';
  const isNext = room.state !== 'out' && room.next_id === me.id;
  const turn = turnP(me, now);
  const slow = holding && turn > SLOW_MS;
  const holder = people.find((p) => p.id === room.holder_id);

  let status;
  if (holding) status = slow ? slowMessage(me.id + me.started_at) : '¡Tenés el mate! Cuando lo devuelvas, tocá el botón';
  else if (isNext) status = '¡Te toca! Preparate 👀';
  else if (room.state === 'out') status = `Lo tiene ${holder?.name || 'alguien'}`;
  else if (room.state === 'idle') status = 'Esperando que el cebador arranque';
  else status = 'El cebador está cebando';

  return (
    <div className={`mepanel ${holding ? 'holding' : ''} ${slow ? 'slow' : ''}`} style={{ '--c': me.color }}>
      <div className="who">
        <span className="av big">{me.avatar}</span>
        <div>
          <div className="name">{me.name}</div>
          {me.nickname && <div className="nick">{me.nickname}</div>}
        </div>
      </div>
      <div className="metime">
        <div className="mlbl">{holding ? 'Este mate' : 'Tu total'}</div>
        <div className="time">
          {fmt(holding ? turn : elapsedP(me, now)).main}
          <span className="cs">{fmt(holding ? turn : elapsedP(me, now)).cs}</span>
        </div>
      </div>
      <div className="meact">
        <button className={`big ${holding ? 'ret' : ''}`} disabled={!holding || busy} onClick={onReturn}>
          {holding ? (
            <>
              <Arrow back />
              Devolví el mate
            </>
          ) : (
            'Devolví el mate'
          )}
        </button>
        <div className="status">{status}</div>
      </div>
    </div>
  );
}

// Botón de la barra de arriba para irse: "Cerrar ronda" (cebador) o "Salir de la ronda" (participante)
export function ExitButton({ children, onClick, busy }) {
  return (
    <button className="pill exit" onClick={onClick} disabled={busy}>
      <svg viewBox="0 0 24 24" className="i">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      {children}
    </button>
  );
}

// Pantalla que ven todos cuando el cebador cerró la ronda
export function ClosedPanel({ room, people, now, onHome }) {
  const at = room.closed_at
    ? new Date(room.closed_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
  const mates = room.ceb_rounds;
  return (
    <>
      <div className="closed rise" style={{ '--i': 1 }}>
        <div className="closed-emoji">🧉</div>
        <h2>La ronda terminó</h2>
        <p className="sub">
          Ronda de <b>{room.cebador_name}</b> · Código {room.code}
          {at && <> · Cerrada el {at}</>}
        </p>
        <div className="closed-stat">
          <b>{mates}</b>
          <span>{mates === 1 ? 'mate cebado' : 'mates cebados'}</span>
        </div>
        <button className="big" onClick={onHome}>
          Volver al inicio
        </button>
      </div>
      <div className="rise" style={{ '--i': 2 }}>
        {people.length ? (
          <Ranking people={people} now={now} />
        ) : (
          <div className="empty">
            <div className="muted">No llegó a sumarse nadie a esta ronda.</div>
          </div>
        )}
      </div>
    </>
  );
}

export function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatars">
      {AVATARS.map((a) => (
        <button type="button" key={a} className={a === value ? 'sel' : ''} onClick={() => onChange(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

// Formulario para sumarse (o crear la ronda si sos cebador)
export function JoinForm({ title, subtitle, cta, withNickname = true, onSubmit, busy, error, defaultAvatar = '🧉' }) {
  const [name, setName] = useState('');
  const [nick, setNick] = useState('');
  const [avatar, setAvatar] = useState(defaultAvatar);
  return (
    <form
      className="form rise"
      style={{ '--i': 3 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit({ name: name.trim(), nickname: nick.trim(), avatar });
      }}
    >
      <h2>{title}</h2>
      {subtitle && <p className="sub">{subtitle}</p>}
      <label>
        Tu nombre
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Ej: Gabino" autoFocus />
      </label>
      {withNickname && (
        <label>
          Apodo (opcional)
          <div className="nickrow">
            <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={40} placeholder="Ej: Bombilla Fantasma" />
            <button type="button" className="dice" title="Apodo al azar" onClick={() => setNick(randomNickname())}>
              🎲
            </button>
          </div>
        </label>
      )}
      <div className="lbltxt">Elegí tu avatar</div>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      {error && <div className="err">{error}</div>}
      <button className="big" disabled={busy || !name.trim()}>
        {cta}
      </button>
    </form>
  );
}

// Votación cada 10 mates
export function VoteModal({ room, people, votes, me, isCeb, onVote, onClose, onHide }) {
  const mine = votes.find((v) => v.participant_id === me?.id);
  const tally = (k) => ({
    si: votes.filter((v) => v[k] === true).length,
    no: votes.filter((v) => v[k] === false).length,
  });
  const qs = [
    { k: 'yerba', q: '¿Cambiamos la yerba?', e: '🌿' },
    { k: 'agua', q: '¿Calentamos el agua?', e: '🔥' },
  ];
  const set = (k, val) => {
    const next = { yerba: mine?.yerba ?? null, agua: mine?.agua ?? null, [k]: val };
    onVote(next.yerba, next.agua);
  };
  return (
    <div className="modal-bg" onClick={onHide}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mtitle">🗳️ ¡Ya van {room.vote_n * 10} mates!</div>
        <p className="sub">
          Votaron {votes.length} de {people.length}
        </p>
        {qs.map(({ k, q, e }) => {
          const t = tally(k);
          const win = t.si > t.no ? 'Sí' : t.no > t.si ? 'No' : 'Empate';
          return (
            <div className="q" key={k}>
              <div className="qt">
                {e} {q}
              </div>
              <div className="qopts">
                <button
                  disabled={!me}
                  className={mine?.[k] === true ? 'sel si' : ''}
                  onClick={() => set(k, true)}
                >
                  Sí <b>{t.si}</b>
                </button>
                <button
                  disabled={!me}
                  className={mine?.[k] === false ? 'sel no' : ''}
                  onClick={() => set(k, false)}
                >
                  No <b>{t.no}</b>
                </button>
              </div>
              {isCeb && votes.length > 0 && <div className="win">Va ganando: {win}</div>}
            </div>
          );
        })}
        <div className="mfoot">
          {isCeb ? (
            <button className="big" onClick={onClose}>
              Cerrar votación
            </button>
          ) : (
            <button className="link" onClick={onHide}>
              Ocultar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Flash({ flash, onDismiss }) {
  if (!flash) return null;
  return (
    <div className="flash" style={{ '--c': flash.color || '#ff9a3c' }} onClick={onDismiss}>
      <div className="flash-card">
        <div className="flash-emoji">{flash.emoji || '🧉'}</div>
        <div className="flash-title">{flash.title}</div>
        {flash.body && <div className="flash-body">{flash.body}</div>}
        <div className="flash-hint">Tocá para cerrar</div>
      </div>
    </div>
  );
}
