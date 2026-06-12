export function Mascot({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {/* Tail fan — 3 parts, drawn first (behind) */}
      <ellipse cx="23" cy="57" rx="6" ry="3" fill="#a8524a" transform="rotate(-35 23 57)" />
      <ellipse cx="32" cy="59" rx="5" ry="3.5" fill="#8e3f38" />
      <ellipse cx="41" cy="57" rx="6" ry="3" fill="#a8524a" transform="rotate(35 41 57)" />

      {/* Tail segments */}
      <ellipse cx="32" cy="50" rx="5" ry="3" fill="#a8524a" />
      <ellipse cx="32" cy="44" rx="7" ry="4" fill="#8e3f38" />
      <ellipse cx="32" cy="37" rx="9" ry="4.5" fill="#a8524a" />

      {/* Claw arms */}
      <path d="M 20 25 Q 16 22 12 25" stroke="#a8524a" strokeWidth="3" strokeLinecap="round" />
      <path d="M 44 25 Q 48 22 52 25" stroke="#a8524a" strokeWidth="3" strokeLinecap="round" />

      {/* Claws — round */}
      <circle cx="11" cy="26" r="6.5" fill="#a8524a" />
      <circle cx="53" cy="26" r="6.5" fill="#a8524a" />

      {/* Body — oval */}
      <ellipse cx="32" cy="26" rx="12" ry="10" fill="#8e3f38" />

      {/* Legs — 4 laterali (2 per lato) */}
      <line x1="20" y1="29" x2="11" y2="35" stroke="#7a3430" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="33" x2="10" y2="40" stroke="#7a3430" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="29" x2="53" y2="35" stroke="#7a3430" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="33" x2="54" y2="40" stroke="#7a3430" strokeWidth="1.5" strokeLinecap="round" />

      {/* Antennae — lunghe e curve */}
      <path d="M 26 17 Q 15 10 5 3" stroke="#c4665a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 38 17 Q 49 10 59 3" stroke="#c4665a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5" cy="3" r="2" fill="#c4665a" />
      <circle cx="59" cy="3" r="2" fill="#c4665a" />

      {/* Occhi — tondi */}
      <circle cx="27" cy="19" r="3.5" fill="#1a1410" />
      <circle cx="37" cy="19" r="3.5" fill="#1a1410" />
      {/* Riflesso occhi */}
      <circle cx="28.2" cy="18" r="1.2" fill="#ffffff" />
      <circle cx="38.2" cy="18" r="1.2" fill="#ffffff" />
    </svg>
  );
}
