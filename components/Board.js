'use client';
import { useEffect, useRef, useState } from 'react';
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

// Tarjetas de cada participante. El cebador las puede arrastrar para ordenar la ronda
// (con mouse se arrastra directo; en el celu, se mantiene apretado un toque y después se arrastra).
export function Cards({ room, people, now, meId, isCeb, onAction, onMove }) {
  const [order, setOrder] = useState(null); // orden optimista mientras llega la confirmación
  const [drag, setDrag] = useState(null); // { id, dx, dy, index }
  const refs = useRef(new Map());
  const justDragged = useRef(false);

  const key = people.map((p) => `${p.id}:${p.position}`).join(',');
  useEffect(() => setOrder(null), [key]);

  const list = order ? order.map((id) => people.find((p) => p.id === id)).filter(Boolean) : people;
  if (!list.length) return null;

  const canDrag = isCeb && Boolean(onMove);
  const canPick = isCeb && room.state !== 'out';

  // Lugar donde caería (índice en la lista sin el que se arrastra): la tarjeta más cercana al puntero
  const targetIndex = (x, y, id) => {
    let best = null;
    list
      .filter((p) => p.id !== id)
      .forEach((p, i) => {
        const r = refs.current.get(p.id)?.getBoundingClientRect();
        if (!r) return;
        const cx = r.left + r.width / 2;
        const d = Math.hypot(x - cx, y - (r.top + r.height / 2));
        if (!best || d < best.d) best = { d, i, after: x > cx };
      });
    return best ? best.i + (best.after ? 1 : 0) : 0;
  };

  const onDown = (e, p) => {
    if (!canDrag || e.button !== 0 || e.target.closest('button')) return;
    const from = list.findIndex((x) => x.id === p.id);
    const s = {
      x0: e.clientX, y0: e.clientY, sy0: window.scrollY, x: e.clientX, y: e.clientY,
      active: false, touch: e.pointerType === 'touch', timer: null, raf: 0,
    };
    const update = () =>
      setDrag({ id: p.id, dx: s.x - s.x0, dy: s.y - s.y0 + window.scrollY - s.sy0, index: targetIndex(s.x, s.y, p.id) });
    // Si el puntero se acerca al borde de la pantalla, la página se desplaza sola
    const edgeScroll = () => {
      const m = 80;
      const v = s.y < m ? -(m - s.y) / 5 : s.y > window.innerHeight - m ? (s.y - window.innerHeight + m) / 5 : 0;
      if (v) {
        window.scrollBy(0, v);
        update();
      }
      s.raf = requestAnimationFrame(edgeScroll);
    };
    const activate = () => {
      s.active = true;
      setDrag({ id: p.id, dx: 0, dy: 0, index: from });
      s.raf = requestAnimationFrame(edgeScroll);
      navigator.vibrate?.(12);
    };
    const move = (ev) => {
      s.x = ev.clientX;
      s.y = ev.clientY;
      const dx = ev.clientX - s.x0;
      const dy = ev.clientY - s.y0;
      if (!s.active) {
        if (s.touch) {
          if (Math.hypot(dx, dy) > 8) finish(ev, false); // se movió antes de tiempo: es scroll
          return;
        }
        if (Math.hypot(dx, dy) < 6) return;
        activate();
      }
      update();
    };
    const noScroll = (ev) => s.active && ev.cancelable && ev.preventDefault();
    const up = (ev) => finish(ev, true);
    const cancel = (ev) => finish(ev, false);
    const finish = (ev, drop) => {
      clearTimeout(s.timer);
      cancelAnimationFrame(s.raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', noScroll);
      if (!s.active) return;
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      setDrag(null);
      if (!drop) return;
      const to = targetIndex(ev.clientX, ev.clientY, p.id);
      if (to === from) return;
      const ids = list.filter((x) => x.id !== p.id).map((x) => x.id);
      ids.splice(to, 0, p.id);
      setOrder(ids);
      onMove(p.id, to);
    };
    if (s.touch) s.timer = setTimeout(activate, 280);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', noScroll, { passive: false });
  };

  // Dónde mostrar la marca de "va acá"
  const others = drag ? list.filter((p) => p.id !== drag.id) : [];
  const from = drag ? list.findIndex((p) => p.id === drag.id) : -1;
  const markBefore = drag && drag.index !== from && drag.index < others.length ? others[drag.index].id : null;
  const markAfter = drag && drag.index !== from && drag.index >= others.length ? others[others.length - 1]?.id : null;

  return (
    <div className={`grid ${drag ? 'dragging' : ''}`}>
      {list.map((p, i) => {
        const on = Boolean(p.started_at);
        const holding = room.holder_id === p.id;
        const isNext = room.state !== 'out' && room.next_id === p.id;
        const slow = holding && turnP(p, now) > SLOW_MS;
        const isCebP = p.id === room.ceb_pid;
        const lifted = drag?.id === p.id;
        const cls = [
          'p',
          'rise',
          on && 'on',
          isNext && 'next',
          p.id === meId && 'me',
          canPick && 'pick',
          canDrag && 'grab',
          slow && 'slow',
          lifted && 'lifted',
          markBefore === p.id && 'mark-before',
          markAfter === p.id && 'mark-after',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={p.id}
            ref={(el) => (el ? refs.current.set(p.id, el) : refs.current.delete(p.id))}
            className={cls}
            style={{ '--c': p.color, '--i': i, ...(lifted ? { transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-1.5deg)` } : null) }}
            onPointerDown={(e) => onDown(e, p)}
            onContextMenu={(e) => canDrag && e.preventDefault()}
            onClick={() => !justDragged.current && canPick && !isNext && onAction('set_next', p.id)}
            title={canDrag ? 'Arrastrá para ordenar la ronda · tocá para que sea el próximo' : undefined}
          >
            <div className="who">
              <span className="av">{p.avatar}</span>
              <div>
                <div className="name">
                  {p.name}
                  {p.id === meId && <span className="you">vos</span>}
                  {isCebP && <span className="ceba">ceba</span>}
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
                <button title="Mover antes" disabled={i === 0} onClick={() => onMove?.(p.id, i - 1)}>
                  ◀
                </button>
                <button title="Mover después" disabled={i === list.length - 1} onClick={() => onMove?.(p.id, i + 1)}>
                  ▶
                </button>
                {!isCebP && (
                  <button
                    title="Sacar de la ronda"
                    className="kick"
                    onClick={() => window.confirm(`¿Sacar a ${p.name} de la ronda?`) && onAction('kick', p.id)}
                  >
                    ✕
                  </button>
                )}
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
