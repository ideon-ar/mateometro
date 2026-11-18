'use client';
import { useState } from 'react';
import { fmt, elapsedP, avgP, turnP } from '@/lib/time';
import { SLOW_MS, slowMessage } from '@/lib/fun';

const C = 2 * Math.PI * 90;

export function Ring({ ms, children, className = '' }) {
  return (
    <div className={`ring ${className}`}>
      <svg viewBox="0 0 200 200">
        <circle className="track" cx="100" cy="100" r="90" fill="none" strokeWidth="9" />
        <circle
          className="prog"
          cx="100"
          cy="100"
          r="90"
          fill="none"
          strokeWidth="9"
          style={{ strokeDasharray: C, strokeDashoffset: C * (1 - (ms % 60000) / 60000) }}
        />
      </svg>
      <div className="readout">{children}</div>
    </div>
  );
}

export function Time({ ms }) {
  const f = fmt(ms);
  return (
    <>
      <div className="time">{f.main}</div>
      <div className="cs">{f.cs}</div>
    </>
  );
}

// Tarjetas de cada participante
export function Cards({ room, people, now, meId, isCeb, onAction }) {
  if (!people.length) return null;
  return (
    <div className="grid">
      {people.map((p, i) => {
        const on = Boolean(p.started_at);
        const holding = room.holder_id === p.id;
        const isNext = room.state !== 'out' && room.next_id === p.id;
        const slow = holding && turnP(p, now) > SLOW_MS;
        const cls = ['p', 'rise', on && 'on', isNext && 'next', p.id === meId && 'me', isCeb && room.state !== 'out' && 'pick', slow && 'slow']
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={p.id}
            className={cls}
            style={{ '--c': p.color, '--i': i }}
            onClick={() => isCeb && room.state !== 'out' && !isNext && onAction('set_next', p.id)}
            title={isCeb && room.state !== 'out' ? 'Tocá para que sea el próximo' : undefined}
          >
            <div className="who">
              <span className="av">{p.avatar}</span>
              <div>
                <div className="name">
                  {p.name}
                  {p.id === meId && <span className="you">vos</span>}
                </div>
                {p.nickname && <div className="nick">{p.nickname}</div>}
              </div>
            </div>
            <Ring ms={elapsedP(p, now)}>
              <Time ms={elapsedP(p, now)} />
            </Ring>
            <div className="stats">
              <span>
                Mates <b>{p.rounds}</b>
              </span>
              <span>
                Prom <b>{fmt(avgP(p, now)).main}</b>
              </span>
            </div>
            <div className="badge">
              {slow ? slowMessage(p.id + p.started_at) : holding ? (room.paused ? 'En pausa' : 'Tiene el mate') : isNext ? 'Le toca' : ''}
            </div>
            {isCeb && (
              <div className="order" onClick={(e) => e.stopPropagation()}>
                <button title="Mover antes" disabled={i === 0} onClick={() => onAction('up', p.id)}>
                  ◀
                </button>
                <button title="Mover después" disabled={i === people.length - 1} onClick={() => onAction('down', p.id)}>
                  ▶
                </button>
                <button
                  title="Sacar de la ronda"
                  className="kick"
                  onClick={() => window.confirm(`¿Sacar a ${p.name} de la ronda?`) && onAction('kick', p.id)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Ranking en vivo
export function Ranking({ people, now }) {
  const [mode, setMode] = useState('total');
  if (!people.length) return null;
  const val = (p) => (mode === 'total' ? elapsedP(p, now) : avgP(p, now));
  const sorted = [...people].sort((a, b) => val(b) - val(a) || a.position - b.position);
  const max = Math.max(1, val(sorted[0]));
  const rowH = 58;
  return (
    <div className="rank">
      <div className="rhead">
        <h2>Ranking de demora</h2>
        <div className="seg">
          <button className={mode === 'total' ? 'act' : ''} onClick={() => setMode('total')}>
            Total
          </button>
          <button className={mode === 'avg' ? 'act' : ''} onClick={() => setMode('avg')}>
            Promedio
          </button>
        </div>
      </div>
      <div className="rows" style={{ height: people.length * rowH }}>
        {people.map((p) => {
          const k = sorted.indexOf(p);
          const v = val(p);
          const f = fmt(v);
          const top = k === 0 && v > 0;
          return (
            <div key={p.id} className={`row ${top ? 'top' : ''}`} style={{ top: k * rowH, '--c': p.color }}>
              <div className="pos">{k + 1}</div>
              <div className="bar">
                <div className="fill" style={{ width: `${(v / max) * 100}%` }} />
                <div className="lbl">
                  <span>{p.avatar}</span>
                  <span className="lname">{p.name}</span>
                  {p.started_at && <span className="live" />}
                  {top && <span className="tag">el más lento</span>}
                </div>
              </div>
              <div className="val">
                {f.main}
                {f.cs}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
