'use client';
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/lib/prefs';
import { ding, unlockAudio } from '@/lib/alerts';

const Sun = () => (
  <svg viewBox="0 0 24 24" className="i">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" className="i">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const Auto = () => (
  <svg viewBox="0 0 24 24" className="i">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
const Gear = () => (
  <svg viewBox="0 0 24 24" className="i">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

function Switch({ on, onChange, label }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="switch-label">{label}</span>
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
    </button>
  );
}

// Botón de ajustes con menú: tema, fondo animado y sonido
export default function Settings() {
  const { theme, setTheme, motion, setMotion, sound, setSound } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="settings" ref={ref}>
      <button className={`iconbtn ${open ? 'act' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Ajustes" title="Ajustes">
        <Gear />
      </button>
      <div className={`menu ${open ? 'open' : ''}`} role="menu">
        <div className="menu-title">Tema</div>
        <div className="theme-seg">
          {[
            ['light', 'Claro', <Sun key="s" />],
            ['dark', 'Oscuro', <Moon key="m" />],
            ['system', 'Auto', <Auto key="a" />],
          ].map(([v, l, ic]) => (
            <button key={v} className={theme === v ? 'act' : ''} onClick={() => setTheme(v)}>
              {ic}
              <span>{l}</span>
            </button>
          ))}
        </div>
        <div className="menu-sep" />
        <Switch on={motion} onChange={setMotion} label="Fondo en movimiento" />
        <Switch
          on={sound}
          onChange={(v) => {
            unlockAudio();
            setSound(v);
            if (v) ding('vote');
          }}
          label="Sonido de avisos"
        />
      </div>
    </div>
  );
}
