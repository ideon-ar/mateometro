'use client';
import { useEffect, useState } from 'react';

// Si se publica una versión nueva mientras la página está abierta, avisa para recargar.
// (Las pestañas abiertas siguen con el código viejo hasta que se recargan.)
export default function UpdateBanner() {
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD;
    if (!mine || mine === 'dev') return;
    const check = async () => {
      try {
        const r = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' });
        const { build } = await r.json();
        if (build && build !== 'dev' && build !== mine) setFresh(true);
      } catch {}
    };
    const iv = setInterval(check, 2 * 60 * 1000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    check();
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (!fresh) return null;
  return (
    <div className="update" role="status">
      <span>🧉 Hay una versión nueva del mateometro</span>
      <button className="pill accent" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  );
}
