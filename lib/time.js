const pad = (n) => String(n).padStart(2, '0');

export function fmt(ms) {
  ms = Math.max(0, ms || 0);
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return { main: (h ? h + ':' : '') + pad(m) + ':' + pad(s), cs: '.' + pad(cs) };
}

// Tiempo total de un participante (acumulado + lo que lleva corriendo)
export const elapsedP = (p, now) =>
  Number(p?.acc_ms || 0) + (p?.started_at ? Math.max(0, now - Date.parse(p.started_at)) : 0);

// Tiempo del turno actual (desde que le pasaron el mate)
export const turnP = (p, now) => (p?.started_at ? Math.max(0, now - Date.parse(p.started_at)) : 0);

export const elapsedC = (r, now) =>
  Number(r?.ceb_acc_ms || 0) + (r?.ceb_started_at ? Math.max(0, now - Date.parse(r.ceb_started_at)) : 0);

export const avgP = (p, now) => (p?.rounds ? elapsedP(p, now) / p.rounds : 0);
