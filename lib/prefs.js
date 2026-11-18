'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getPref, setPref } from './session';

// Preferencias de cada usuario (se guardan en su navegador)
const Ctx = createContext(null);

const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function PrefsProvider({ children }) {
  const [theme, setThemeS] = useState('system'); // system | light | dark
  const [motion, setMotionS] = useState(true); // fondo animado
  const [sound, setSoundS] = useState(true);

  useEffect(() => {
    setThemeS(getPref('theme', 'system'));
    setMotionS(getPref('motion', !reducedMotion()));
    setSoundS(getPref('sound', true));
  }, []);

  // Aplicar tema (y seguir al sistema si está en "system")
  useEffect(() => {
    const apply = () => {
      const t = theme === 'system' ? (systemDark() ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = t;
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = motion ? 'on' : 'off';
  }, [motion]);

  // Efecto "ripple" en todos los botones
  useEffect(() => {
    const onDown = (e) => {
      const el = e.target.closest?.('button:not(:disabled), .btn');
      if (!el || el.classList.contains('no-ripple')) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  const setTheme = useCallback((v) => {
    setThemeS(v);
    setPref('theme', v);
  }, []);
  const setMotion = useCallback((v) => {
    setMotionS(v);
    setPref('motion', v);
  }, []);
  const setSound = useCallback((v) => {
    setSoundS(v);
    setPref('sound', v);
  }, []);

  return <Ctx.Provider value={{ theme, setTheme, motion, setMotion, sound, setSound }}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);

// Script que corre antes de pintar, para que no "parpadee" el tema
export const noFlashScript = `(function(){try{
var g=function(k,d){var v=localStorage.getItem('mateometro:pref:'+k);return v===null?d:JSON.parse(v)};
var t=g('theme','system');
var d=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;
document.documentElement.dataset.theme=d;
var m=g('motion',!matchMedia('(prefers-reduced-motion: reduce)').matches);
document.documentElement.dataset.motion=m?'on':'off';
}catch(e){document.documentElement.dataset.theme='dark'}})();`;
