// Avisos: sonido (Web Audio), notificación del sistema y título titilando

let ctx = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

function tone(freq, start, dur, vol = 0.35) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

// kind: 'return' (devolvieron), 'pass' (te pasaron), 'slow', 'vote'
export function ding(kind = 'return') {
  try {
    unlockAudio();
    if (!ctx) return;
    if (kind === 'return') {
      [0, 0.18, 0.36].forEach((t, i) => tone([880, 1175, 1568][i], t, 0.5, 0.45));
      [0.9, 1.08, 1.26].forEach((t, i) => tone([880, 1175, 1568][i], t, 0.5, 0.45));
    } else if (kind === 'pass') {
      tone(988, 0, 0.35, 0.4);
      tone(1319, 0.15, 0.6, 0.4);
    } else if (kind === 'slow') {
      tone(440, 0, 0.3, 0.3);
      tone(330, 0.25, 0.5, 0.3);
    } else {
      tone(660, 0, 0.25, 0.25);
      tone(880, 0.12, 0.4, 0.25);
    }
  } catch {}
}

export function notifSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function askNotifPermission() {
  if (!notifSupported()) return 'unsupported';
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }
  return Notification.permission;
}

export function notify(title, body, tag) {
  if (!notifSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, renotify: true, requireInteraction: false });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {}
}

// Título de la pestaña titilando hasta que se llame a la función devuelta
let blinkTimer = null;
let baseTitle = null;
export function blinkTitle(text) {
  stopBlink();
  baseTitle = document.title;
  let on = false;
  blinkTimer = setInterval(() => {
    document.title = on ? baseTitle : text;
    on = !on;
  }, 700);
}
export function stopBlink() {
  if (blinkTimer) clearInterval(blinkTimer);
  blinkTimer = null;
  if (baseTitle) document.title = baseTitle;
  baseTitle = null;
}
