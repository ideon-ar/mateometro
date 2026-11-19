'use client';
import { useId } from 'react';

// Mate visto desde arriba mientras se ceba: la montañita de yerba arriba, el pocito abajo
// con la bombilla, y el chorrito de agua que lo va llenando. Va de fondo, semitransparente,
// atrás del emoji del cebador.
export function CebandoArt() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = (n) => `${n}-${id}`;
  return (
    <svg className="cebando" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        {/* Textura de yerba: hojitas claras y oscuras */}
        <pattern id={p('yerba')} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <rect width="5" height="5" fill="#8a9a45" />
          <circle cx="1" cy="1.2" r=".7" fill="#b9c873" />
          <circle cx="3.6" cy="3.3" r=".6" fill="#5e6d28" />
          <circle cx="3.9" cy=".8" r=".35" fill="#d6dc9c" />
          <circle cx="1.4" cy="3.9" r=".4" fill="#6f7f30" />
        </pattern>
        {/* La montañita: más clara arriba (la cima), más oscura hacia el pocito */}
        <radialGradient id={p('loma')} cx=".5" cy=".12" r=".85">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#2c3510" stopOpacity=".45" />
        </radialGradient>
        <radialGradient id={p('agua')} cx=".45" cy=".4" r=".7">
          <stop offset="0" stopColor="#c8d27e" />
          <stop offset=".6" stopColor="#7f8f36" />
          <stop offset="1" stopColor="#4c5a1c" />
        </radialGradient>
        <clipPath id={p('boca')}>
          <circle cx="20" cy="20" r="17" />
        </clipPath>
        <clipPath id={p('pozo')}>
          <ellipse cx="20" cy="28" rx="10.5" ry="6.5" />
        </clipPath>
      </defs>

      {/* Calabaza: el borde de la boca */}
      <circle cx="20" cy="20" r="19" fill="#6b3d1f" />
      <circle cx="20" cy="20" r="17.6" fill="none" stroke="#b9c0c8" strokeWidth="1.2" />

      <g clipPath={`url(#${p('boca')})`}>
        {/* Yerba con la montañita */}
        <rect width="40" height="40" fill={`url(#${p('yerba')})`} />
        <rect width="40" height="40" fill={`url(#${p('loma')})`} />
        {/* El pocito: yerba mojada, más oscura */}
        <ellipse cx="20" cy="28" rx="10.5" ry="6.5" fill="#4a5520" />
        <path d="M9.5 27.4 Q20 19.5 30.5 27.4" fill="none" stroke="#2f3812" strokeWidth=".9" strokeOpacity=".7" />
        {/* El agua que va llenando el pocito */}
        <g clipPath={`url(#${p('pozo')})`}>
          <ellipse className="ceb-pool" cx="20" cy="29" rx="10.5" ry="6.5" fill={`url(#${p('agua')})`} />
          <ellipse className="ceb-ripple" cx="23" cy="27" rx="2.4" ry="1.4" fill="none" stroke="#eef3d0" strokeWidth=".6" />
        </g>
        {/* Bombilla */}
        <path d="M19 30 L17.5 40" stroke="#c9ced6" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 30 L17.5 40" stroke="#fff" strokeWidth=".6" strokeLinecap="round" strokeOpacity=".7" />
        <ellipse cx="19.2" cy="29.4" rx="1.6" ry="1" fill="#aab2bc" />
      </g>

      {/* Chorrito de agua del termo, que cae sobre el pocito */}
      <path className="ceb-stream" d="M38 3 Q33 13 23.5 26.5" fill="none" stroke="#f3f7ff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Cuadradito del cebador: cuando está cebando, lleva la animación de fondo
export function CebAvatar({ avatar, cebando, className = 'av' }) {
  return (
    <span className={`${className} ceb-av ${cebando ? 'is-cebando' : ''}`}>
      {cebando && <CebandoArt />}
      <span className="ceb-emoji">{avatar}</span>
    </span>
  );
}

export const isCebando = (room) => Boolean(room && !room.closed && room.state === 'ceb' && room.ceb_started_at && !room.paused);
