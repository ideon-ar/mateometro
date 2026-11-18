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
