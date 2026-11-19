'use client';
import { useId } from 'react';

// Mate en vista 3/4 (isométrica) mientras se ceba: la calabaza con su virola, la montañita de
// yerba cortada recta, el pocito con la bombilla, y el chorrito de agua celeste que lo va llenando.
export function CebandoArt() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = (n) => `${n}-${id}`;
  const u = (n) => `url(#${p(n)})`;

  // Boca del mate (elipse) y la línea recta del corte de la montañita
  const MOUTH = { cx: 24, cy: 19, rx: 15, ry: 5.6 };
  // El corte va recto de atrás (arriba) hacia adelante (abajo): a la derecha la montañita, a la izquierda el pocito
  const CUT_TOP = [24.5, 12.6];
  const CUT_BOT = [27.5, 25.4];
  const WALL = 3.2; // ancho de la pared del corte vista desde arriba

  return (
    <svg className="cebando" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <pattern id={p('yerba')} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <rect width="5" height="5" fill="#8a9a46" />
          <rect x=".3" y=".5" width="1.1" height=".45" rx=".2" fill="#c3d07f" transform="rotate(25 .8 .7)" />
          <rect x="2.6" y="1.4" width=".9" height=".4" rx=".2" fill="#5f6e29" transform="rotate(-40 3 1.6)" />
          <rect x="1.2" y="3.1" width="1" height=".4" rx=".2" fill="#a9b863" transform="rotate(70 1.7 3.3)" />
          <rect x="3.4" y="3.8" width=".8" height=".35" rx=".2" fill="#6b7a2f" transform="rotate(10 3.8 4)" />
          <circle cx="4.3" cy=".6" r=".28" fill="#e2e8b0" />
          <circle cx="2.2" cy="2.4" r=".22" fill="#e2e8b0" />
          <circle cx=".6" cy="4.3" r=".3" fill="#55631f" />
          <circle cx="3.6" cy="2.7" r=".2" fill="#cdd88f" />
        </pattern>
        <pattern id={p('mojada')} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
          <rect width="4" height="4" fill="#4d5a21" />
          <rect x=".5" y=".7" width="1.5" height=".6" rx=".3" fill="#6b7a30" />
          <circle cx="3" cy="2.8" r=".45" fill="#3a4416" />
        </pattern>
        <linearGradient id={p('cuero')} x1="0" x2="1">
          <stop offset="0" stopColor="#3a120a" />
          <stop offset=".32" stopColor="#8a321b" />
          <stop offset=".5" stopColor="#6e2614" />
          <stop offset="1" stopColor="#2e0e07" />
        </linearGradient>
        <linearGradient id={p('pata')} x1="0" x2="1">
          <stop offset="0" stopColor="#4a170c" />
          <stop offset=".5" stopColor="#7c2c17" />
          <stop offset="1" stopColor="#3a1109" />
        </linearGradient>
        <linearGradient id={p('alpaca')} x1="0" x2="1">
          <stop offset="0" stopColor="#7d6531" />
          <stop offset=".3" stopColor="#e9d49a" />
          <stop offset=".5" stopColor="#c4a65e" />
          <stop offset=".75" stopColor="#f3e3b0" />
          <stop offset="1" stopColor="#6e5626" />
        </linearGradient>
        <linearGradient id={p('metal')} x1="0" x2="1">
          <stop offset="0" stopColor="#8d97a3" />
          <stop offset=".4" stopColor="#f2f5f8" />
          <stop offset=".7" stopColor="#b8c1cb" />
          <stop offset="1" stopColor="#77818d" />
        </linearGradient>
        <linearGradient id={p('agua')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe8f7" />
          <stop offset=".5" stopColor="#7fc4d6" />
          <stop offset="1" stopColor="#5e9a7a" />
        </linearGradient>
        <linearGradient id={p('chorro')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        <clipPath id={p('boca')}>
          <ellipse {...MOUTH} />
        </clipPath>
        {/* El pocito: la parte de la boca a la izquierda del corte */}
        <clipPath id={p('pozo')}>
          <path d={`M0 0 L${CUT_TOP[0] - WALL} 0 L${CUT_TOP[0] - WALL} ${CUT_TOP[1]} L${CUT_BOT[0] - WALL} ${CUT_BOT[1]} L${CUT_BOT[0] - WALL} 48 L0 48 Z`} />
        </clipPath>
      </defs>

      {/* Sombra en la mesa */}
      <ellipse cx="24" cy="46.8" rx="14" ry="1.3" fill="#000" opacity=".25" />

      {/* Mate imperial: patitas de cuero a los costados (atrás del cuerpo) */}
      <path d="M12.6 37.6 Q14.8 40.6 17.4 41.6 L16.2 46.4 L11.4 46.4 Z" fill={u('pata')} />
      <path d="M35.4 37.6 Q33.2 40.6 30.6 41.6 L31.8 46.4 L36.6 46.4 Z" fill={u('pata')} />

      {/* Cuerpo de cuero bordó, con forma de huevo */}
      <path d="M8.8 25.6 C7.2 35.5 13 43.6 24 44 C35 43.6 40.8 35.5 39.2 25.6 A15.2 5.6 0 0 1 8.8 25.6 Z" fill={u('cuero')} />
      <path d="M12 30 C12.3 36 15.4 40.4 19.8 42.2" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1.5" strokeLinecap="round" />

      {/* Patita de adelante */}
      <path d="M20.4 40.2 Q24 42 27.6 40.2 L26.8 46.6 Q24 47.2 21.2 46.6 Z" fill={u('pata')} />
      <path d="M21.6 41.4 L22.2 46 M26.4 41.4 L25.8 46" stroke="#d9a476" strokeWidth=".35" strokeDasharray=".9 .8" opacity=".7" />

      {/* Virola ancha de alpaca dorada, cincelada */}
      <path d="M8.4 19.5 A15.6 5.8 0 0 0 39.6 19.5 L39.2 25.6 A15.2 5.6 0 0 1 8.8 25.6 Z" fill={u('alpaca')} />
      <path d="M8.6 20.6 A15.5 5.8 0 0 0 39.4 20.6" fill="none" stroke="#6b5424" strokeWidth=".35" opacity=".8" />
      <path d="M8.9 24.6 A15.2 5.6 0 0 0 39.1 24.6" fill="none" stroke="#6b5424" strokeWidth=".35" opacity=".8" />
      {/* Medallón al frente y arabescos */}
      <ellipse cx="24" cy="27.6" rx="2.3" ry="1.5" fill="#d8bf7c" stroke="#6b5424" strokeWidth=".4" />
      <ellipse cx="24" cy="27.6" rx="1.2" ry=".7" fill="none" stroke="#6b5424" strokeWidth=".3" opacity=".8" />
      <path d="M21.2 27.4 q-1.6 -1.6 -3.2 0 q-1.6 1.6 -3.2 0 q-1.4 -1.4 -2.8 -.2 M26.8 27.4 q1.6 -1.6 3.2 0 q1.6 1.6 3.2 0 q1.4 -1.4 2.8 -.2"
        fill="none" stroke="#6b5424" strokeWidth=".4" strokeLinecap="round" opacity=".85" />
      <path d="M17.2 26.1 l.5 .9 l-.5 .9 l-.5 -.9 Z M30.8 26.1 l.5 .9 l-.5 .9 l-.5 -.9 Z" fill="#6b5424" opacity=".8" />

      {/* Interior: yerba */}
      <g clipPath={u('boca')}>
        {/* Pocito (yerba mojada, más abajo) */}
        <rect width="48" height="48" fill={u('mojada')} />
        <rect width="48" height="48" fill="#000" opacity=".18" />

        {/* El agua que va llenando el pocito: sube desde abajo */}
        <g clipPath={u('pozo')}>
          <g className="ceb-water">
            <ellipse cx="17" cy="25.2" rx="14" ry="9" fill={u('agua')} opacity=".9" />
            <path d="M7 18.4 Q13 16.6 21 18" fill="none" stroke="#eaf8ff" strokeWidth=".6" strokeLinecap="round" opacity=".9" />
          </g>
          <g className="ceb-splash">
            <ellipse className="ceb-ripple" cx="18" cy="19.8" rx="2.6" ry="1" fill="none" stroke="#eaf8ff" strokeWidth=".55" />
          </g>
        </g>

        {/* Pared del corte: recta, más oscura (se ve el costado de la montañita) */}
        <path
          d={`M${CUT_TOP[0]} ${CUT_TOP[1] - 1} L${CUT_BOT[0]} ${CUT_BOT[1] + 1} L${CUT_BOT[0] - WALL} ${CUT_BOT[1] + 1} L${CUT_TOP[0] - WALL} ${CUT_TOP[1] - 1} Z`}
          fill={u('yerba')}
        />
        <path
          d={`M${CUT_TOP[0]} ${CUT_TOP[1] - 1} L${CUT_BOT[0]} ${CUT_BOT[1] + 1} L${CUT_BOT[0] - WALL} ${CUT_BOT[1] + 1} L${CUT_TOP[0] - WALL} ${CUT_TOP[1] - 1} Z`}
          fill="#2f3812"
          opacity=".45"
        />

        {/* Montañita: la cara de arriba, a la derecha del corte, más clara */}
        <path d={`M${CUT_TOP[0]} 0 L48 0 L48 48 L${CUT_BOT[0]} 48 L${CUT_BOT[0]} ${CUT_BOT[1]} L${CUT_TOP[0]} ${CUT_TOP[1]} Z`} fill={u('yerba')} />
        <path d={`M${CUT_TOP[0]} 0 L48 0 L48 48 L${CUT_BOT[0]} 48 L${CUT_BOT[0]} ${CUT_BOT[1]} L${CUT_TOP[0]} ${CUT_TOP[1]} Z`} fill="#fff" opacity=".08" />
        {/* Filo del corte, recto */}
        <path d={`M${CUT_TOP[0]} ${CUT_TOP[1]} L${CUT_BOT[0]} ${CUT_BOT[1]}`} stroke="#d4dc98" strokeWidth=".6" opacity=".85" />
      </g>

      {/* Virola de metal en la boca */}
      <ellipse {...MOUTH} fill="none" stroke={u('metal')} strokeWidth="2.6" />
      <ellipse cx={MOUTH.cx} cy={MOUTH.cy + 0.4} rx={MOUTH.rx + 1.3} ry={MOUTH.ry + 1.3} fill="none" stroke="#5c6570" strokeWidth=".5" opacity=".6" />

      {/* Bombilla: entra en el pocito y sale hacia la izquierda */}
      <path d="M16.5 21.5 L6 7.5" stroke={u('metal')} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16.5 21.5 L6 7.5" stroke="#fff" strokeWidth=".6" strokeLinecap="round" opacity=".7" />
      <path d="M6.6 8.3 L3.2 3.8 L6 2.2 L8.4 6.6 Z" fill={u('metal')} />
      <rect x="9.4" y="11.4" width="3.2" height="1.4" rx=".5" fill="#9aa4af" transform="rotate(53 11 12.1)" />

      {/* Chorrito de agua celeste desde el termo (arriba), que cae en el pocito */}
      <g className="ceb-stream">
        <path d="M20.5 -1 C20.2 6 19.4 13 18.2 20.4" fill="none" stroke={u('chorro')} strokeWidth="2.2" strokeLinecap="round" />
        <path className="ceb-flow" d="M20.5 -1 C20.2 6 19.4 13 18.2 20.4" fill="none" stroke="#e0f7ff" strokeWidth=".8" strokeLinecap="round" strokeDasharray="1.6 3.2" />
      </g>
    </svg>
  );
}

// Cuadradito del cebador: mientras ceba se ve solo el mate (sin emoji)
export function CebAvatar({ avatar, cebando, className = 'av' }) {
  return (
    <span className={`${className} ceb-av ${cebando ? 'is-cebando' : ''}`}>
      {cebando ? <CebandoArt /> : <span className="ceb-emoji">{avatar}</span>}
    </span>
  );
}

export const isCebando = (room) => Boolean(room && !room.closed && room.state === 'ceb' && room.ceb_started_at && !room.paused);
