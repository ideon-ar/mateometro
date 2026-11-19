// Logo del mate y fondo de matecitos

export function Logo({ size = 56 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="gourd" cx=".35" cy=".35" r=".8">
          <stop offset="0" stopColor="#b9743f" />
          <stop offset=".6" stopColor="#7a4421" />
          <stop offset="1" stopColor="#4a2611" />
        </radialGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a96a6" />
          <stop offset=".45" stopColor="#f4f7fa" />
          <stop offset=".7" stopColor="#b5c0cc" />
          <stop offset="1" stopColor="#6b7684" />
        </linearGradient>
        <linearGradient id="metalV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2f6" />
          <stop offset="1" stopColor="#7d8896" />
        </linearGradient>
        <linearGradient id="yerba" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ccc4a" />
          <stop offset="1" stopColor="#4f7d1c" />
        </linearGradient>
        <clipPath id="mouth">
          <ellipse cx="32" cy="27" rx="16.5" ry="4.6" />
        </clipPath>
      </defs>
      <ellipse cx="32" cy="60" rx="15" ry="2.2" fill="#000" opacity=".35" />
      <path d="M14 27 C7 37 8 51 20 57.5 Q32 61.5 44 57.5 C56 51 57 37 50 27 Z" fill="url(#gourd)" />
      <path d="M17 34 C14 41 16 49 21 53" stroke="#fff" strokeOpacity=".22" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="27" rx="18" ry="5.2" fill="#3a1d0b" />
      <g clipPath="url(#mouth)">
        <rect x="10" y="20" width="44" height="14" fill="#5f8f24" />
        <ellipse cx="38" cy="28.5" rx="10" ry="3" fill="#3e6a16" />
      </g>
      <path d="M14.4 27 C14.3 24.6 15.6 22.6 18.2 22.3 C22 22 27.5 24.2 34 28 Q24 30.6 14.4 27 Z" fill="url(#yerba)" />
      <g fill="#c5e48a" opacity=".85">
        <circle cx="18" cy="24" r=".6" />
        <circle cx="22" cy="24.3" r=".55" />
        <circle cx="25.5" cy="26" r=".5" />
        <circle cx="20" cy="26.6" r=".5" />
      </g>
      <g fill="#355a12">
        <circle cx="16.5" cy="25.8" r=".5" />
        <circle cx="23.5" cy="27.4" r=".5" />
        <circle cx="28.5" cy="27.2" r=".45" />
      </g>
      <path d="M39.5 28.5 L50.5 6" stroke="url(#metal)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M50.5 6 Q52 3.6 55 3.8 L58.5 4" stroke="url(#metalV)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="45.2" y="14.5" width="5" height="2.6" rx="1" fill="url(#metal)" transform="rotate(-26.5 47.7 15.8)" />
      <path d="M14 27 A18 5.2 0 0 0 50 27" stroke="url(#metalV)" strokeWidth="2.6" fill="none" />
      <path d="M14 27 A18 5.2 0 0 1 50 27" stroke="#9aa6b3" strokeWidth="1.4" fill="none" opacity=".7" />
    </svg>
  );
}

// Matecito de línea para el fondo (se usa como máscara, así toma el color del tema)
const mateLine = (x, y, size, rot) =>
  `<g transform='translate(${x} ${y}) scale(${size / 64}) rotate(${rot} 32 32)' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 26 C10 35 11 48 21 54 Q32 58 43 54 C53 48 54 35 48 26'/><ellipse cx='32' cy='26' rx='16' ry='4.5'/><path d='M18 26.5 C18 23 20 21.6 23 21.8 C27 22 30 24 33 27'/><path d='M38 27 L48 8 h5'/><path d='M22 40 q10 5 20 0'/></g>`;

const tile = (size, items) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${items.map((i) => mateLine(...i)).join('')}</svg>`,
  )}")`;

const L1 = tile(180, [
  [14, 14, 56, -14],
  [104, 98, 46, 16],
]);
const L2 = tile(260, [
  [150, 20, 38, 24],
  [40, 150, 34, -22],
]);

export function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-layer l1" style={{ WebkitMaskImage: L1, maskImage: L1 }} />
      <div className="bg-layer l2" style={{ WebkitMaskImage: L2, maskImage: L2 }} />
      <div className="bg-fade" />
    </div>
  );
}

export function Header({ small }) {
  return (
    <header className={small ? 'hdr small' : 'hdr'}>
      <span className="logo-wrap">
        <Logo size={small ? 40 : 68} />
      </span>
      <h1 className="brand">
        mateometro<span className="ver">3.0</span>
      </h1>
    </header>
  );
}
