// Cosas divertidas: avatares, apodos, colores y mensajes

export const SLOW_MS = 150_000; // 2:30

// Avatares por categoría (los de siempre van primero en cada una)
export const AVATAR_GROUPS = [
  {
    name: 'Mate y comida',
    list: [
      '🧉', '🍕', '🍵', '☕', '🥐', '🍪', '🍩', '🍰', '🧁', '🥟',
      '🥩', '🍖', '🍷', '🍺', '🧀', '🍋', '🍊', '🍓', '🍉', '🍌',
      '🥑', '🌶️', '🍔', '🌮', '🍿', '🍫', '🍯', '🥖', '🧃', '🫖',
    ],
  },
  {
    name: 'Animales',
    list: [
      '🦄', '🐸', '🦊', '🐼', '🐨', '🐙', '🦥', '🐢', '🦖', '🐧',
      '🦉', '🐶', '🐱', '🐭', '🐹', '🐰', '🐻', '🐯', '🦁', '🐮',
      '🐷', '🐵', '🐔', '🦆', '🦅', '🐴', '🐝', '🦋', '🐞', '🐳',
      '🐬', '🦈', '🦀', '🐊', '🦒', '🦘', '🦙', '🦔', '🐺',
    ],
  },
  {
    name: 'Caras',
    list: [
      '👽', '🤖', '👻', '🤠', '🥸', '😎', '💀', '😀', '😂', '😍',
      '🤩', '😜', '🤪', '🤓', '🧐', '🥳', '😴', '🤯', '🥶', '🥵',
      '😈', '🤡', '👹', '💩', '👾', '🙃', '😇', '🤫', '🤔', '😏',
      '😤', '🥺', '😬', '🤑', '😵',
    ],
  },
  {
    name: 'Personajes',
    list: [
      '🧙', '🦸', '🧑‍💻', '🧑‍🍳', '🧑‍🚀', '🧑‍🎤', '🧑‍🎨', '🧑‍🔬', '🧑‍🌾', '🧑‍🏫',
      '🦹', '🧛', '🧜', '🧚', '🧞', '🧟', '🥷', '🤴', '👸', '🎅',
      '🤶', '👮', '🕵️', '👷', '💂', '🤵', '👰', '🧝', '🧑‍⚕️', '🧑‍✈️',
    ],
  },
  {
    name: 'Hobbies',
    list: [
      '🎸', '🎧', '🚀', '⚽', '🏀', '🏐', '🎾', '🏓', '🥊', '🏆',
      '🥇', '🎮', '🕹️', '🎲', '🧩', '🎯', '🎨', '🎬', '🎤', '🥁',
      '🎹', '🎺', '📚', '✏️', '💻', '📷', '🚲', '🛹', '🏄', '⛺',
      '✈️',
    ],
  },
  {
    name: 'Naturaleza',
    list: [
      '🌵', '🔥', '⚡', '🌻', '🌸', '🍀', '🌈', '⭐', '🌙', '☀️',
      '❄️', '🌊', '🌋', '💎', '👑', '🎩', '🕶️', '🧢', '🎁', '🎈',
      '🍁', '🌍', '🪐', '🌴', '🌹', '🍄', '🐚', '🦴', '💡', '🧲',
      '🔮',
    ],
  },
];

// Todos juntos (sin repetidos)
export const ALL_AVATARS = [...new Set(AVATAR_GROUPS.flatMap((g) => g.list))];

// Toma el primer emoji de un texto (para "Otro emoji"). Devuelve null si no hay ninguno.
export function firstEmoji(text) {
  const str = String(text || '').trim();
  if (!str) return null;
  const parts = typeof Intl !== 'undefined' && Intl.Segmenter
    ? [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(str)].map((x) => x.segment)
    : [...str];
  const e = parts.find((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g));
  // El servidor guarda hasta 8 caracteres: los emojis combinados muy largos no entran
  return e && [...e].length <= 8 ? e : null;
}

export const AVATARS = ALL_AVATARS;

const NOUNS = ['Bombilla', 'Yerba', 'Pava', 'Calabaza', 'Montañita', 'Cebadura', 'Virola', 'Palito', 'Espuma', 'Galleta'];
const ADJS = ['Fantasma', 'Tapada', 'Lavada', 'Rebelde', 'Eterna', 'Dormida', 'Hirviendo', 'Express', 'Perdida',
  'Sin Rumbo', 'de Oro', 'Turbo', 'Nocturna', 'Misteriosa', 'Legendaria', 'Furiosa', 'Tranqui', 'Premium'];

export function randomNickname() {
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const a = ADJS[Math.floor(Math.random() * ADJS.length)];
  return `${n} ${a}`;
}

export const SLOW_MESSAGES = [
  'El mate no es micrófono 🎤',
  '¿Le estás dando una charla TED al mate?',
  'Se está enfriando el agua 🥶',
  'El cebador ya está llorando 😭',
  'Devolvelo, que no es herencia',
  'Che, ¿te lo vas a casar al mate?',
  'Ese mate ya pidió la jubilación',
  'Modo tortuga activado 🐢',
];

export function slowMessage(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SLOW_MESSAGES[h % SLOW_MESSAGES.length];
}

// Colores fijos para los de siempre; el resto toma el primero libre
const KNOWN = {
  gabino: '#a78bfa',
  magali: '#f472b6',
  lucia: '#facc15',
  celeste: '#38bdf8',
  santino: '#86efac',
};
const PALETTE = ['#a78bfa', '#f472b6', '#facc15', '#38bdf8', '#86efac', '#fb923c', '#f87171', '#2dd4bf',
  '#c084fc', '#a3e635', '#e879f9', '#60a5fa'];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export function pickColor(name, used = []) {
  const k = KNOWN[norm(name)];
  if (k && !used.includes(k)) return k;
  return PALETTE.find((c) => !used.includes(c)) || PALETTE[Math.floor(Math.random() * PALETTE.length)];
}
