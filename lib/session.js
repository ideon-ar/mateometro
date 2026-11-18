// Guarda en el navegador quién sos en cada ronda (token de cebador o de participante)
const key = (code) => `mateometro:${String(code).toUpperCase()}`;

export function getSession(code) {
  try {
    return JSON.parse(localStorage.getItem(key(code)) || 'null');
  } catch {
    return null;
  }
}

export function setSession(code, data) {
  try {
    localStorage.setItem(key(code), JSON.stringify(data));
  } catch {}
}

export function clearSession(code) {
  try {
    localStorage.removeItem(key(code));
  } catch {}
}

// Todas las rondas que este navegador tiene guardadas: [{ code, role, room_id, ... }]
export function listSessions() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = /^mateometro:([A-Z0-9]{4})$/.exec(localStorage.key(i) || '');
      const s = m && getSession(m[1]);
      if (s?.room_id) out.push({ ...s, code: m[1] });
    }
  } catch {}
  return out;
}

export function getPref(name, fallback) {
  try {
    const v = localStorage.getItem(`mateometro:pref:${name}`);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function setPref(name, value) {
  try {
    localStorage.setItem(`mateometro:pref:${name}`, JSON.stringify(value));
  } catch {}
}
