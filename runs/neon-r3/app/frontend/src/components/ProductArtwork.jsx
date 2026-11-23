import React from 'react';

export function ProductArtwork({ artwork, size = 155 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 180 180',
    role: 'img',
    'aria-label': artwork,
  };

  switch (artwork) {
    case 'ice-cube':
      return (
        <svg {...common}>
          <ellipse cx="90" cy="148" rx="64" ry="16" fill="#7dd3fc" stroke="#141414" strokeWidth="3" />
          <path d="M52 55 L112 42 L134 72 L126 128 L64 136 L44 102 Z" fill="#e0f2fe" stroke="#141414" strokeWidth="3.5" />
          <path d="M52 55 L74 84 L134 72" fill="none" stroke="#141414" strokeWidth="3" />
          <path d="M74 84 L64 136" fill="none" stroke="#141414" strokeWidth="3" />
          <path d="M62 72 L88 66" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <path d="M126 116 Q138 134 126 142 Q114 134 126 116 Z" fill="#38bdf8" stroke="#141414" strokeWidth="2.5" />
          <rect x="98" y="22" width="68" height="24" rx="5" fill="#ffe600" stroke="#141414" strokeWidth="2.5" transform="rotate(8 132 34)" />
          <text x="132" y="38" textAnchor="middle" fontSize="11" fontWeight="900" fill="#141414" transform="rotate(8 132 34)">MELTING</text>
        </svg>
      );

    case 'cardboard-box':
      return (
        <svg {...common}>
          <polygon points="32,68 96,42 152,66 142,140 84,158 28,132" fill="#d9a066" stroke="#141414" strokeWidth="3.5" />
          <polygon points="32,68 88,92 152,66 96,42" fill="#eab676" stroke="#141414" strokeWidth="3" />
          <path d="M88 92 L84 158" stroke="#141414" strokeWidth="3" />
          <path d="M112 96 L128 88 L120 112 L138 106" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
          <rect x="64" y="54" width="52" height="16" fill="#fef08a" stroke="#141414" strokeWidth="2.5" transform="rotate(-12 90 62)" />
          <text x="90" y="66" textAnchor="middle" fontSize="10" fontWeight="900" fill="#141414" transform="rotate(-12 90 62)">100% AIR</text>
          <text x="58" y="128" fontSize="11" fontWeight="900" fill="#7c2d12" transform="rotate(20 58 128)">DENTED</text>
        </svg>
      );

    case 'usbc-cable':
      return (
        <svg {...common}>
          <rect x="26" y="72" width="34" height="36" rx="6" fill="#141414" />
          <rect x="16" y="80" width="12" height="20" rx="2" fill="#d4d4d8" stroke="#141414" strokeWidth="2.5" />
          <path d="M60 90 C78 90, 96 90, 114 90" stroke="#ff2e4d" strokeWidth="10" strokeLinecap="round" />
          <rect x="114" y="72" width="34" height="36" rx="6" fill="#141414" />
          <rect x="148" y="80" width="14" height="20" rx="2" fill="#d4d4d8" stroke="#141414" strokeWidth="2.5" />
          <line x1="60" y1="126" x2="114" y2="126" stroke="#141414" strokeWidth="2.5" />
          <line x1="60" y1="119" x2="60" y2="133" stroke="#141414" strokeWidth="2.5" />
          <line x1="114" y1="119" x2="114" y2="133" stroke="#141414" strokeWidth="2.5" />
          <text x="87" y="148" textAnchor="middle" fontSize="13" fontWeight="900" fill="#141414">3 INCHES</text>
          <rect x="36" y="26" width="108" height="24" rx="5" fill="#ffe600" stroke="#141414" strokeWidth="2.5" />
          <text x="90" y="42" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#141414">LEFT-HAND ONLY</text>
        </svg>
      );

    case 'bluetooth-rock':
      return (
        <svg {...common}>
          <path d="M36 128 C24 94, 52 54, 96 52 C138 50, 158 84, 150 124 C144 148, 48 152, 36 128 Z" fill="#9ca3af" stroke="#141414" strokeWidth="3.5" />
          <path d="M52 118 C48 92, 66 72, 92 68" fill="none" stroke="#d1d5db" strokeWidth="5" strokeLinecap="round" />
          <circle cx="118" cy="86" r="10" fill="#2563eb" stroke="#141414" strokeWidth="2.5" />
          <circle cx="118" cy="86" r="4" fill="#93c5fd" />
          <path d="M134 62 Q146 72 138 82" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
          <path d="M142 54 Q160 68 148 86" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
          <rect x="30" y="24" width="90" height="24" rx="5" fill="#00e59b" stroke="#141414" strokeWidth="2.5" transform="rotate(-6 75 36)" />
          <text x="75" y="40" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#141414" transform="rotate(-6 75 36)">$29/MO DRM</text>
        </svg>
      );

    case 'headphones':
      return (
        <svg {...common}>
          <path d="M40 102 A50 52 0 0 1 140 102" fill="none" stroke="#141414" strokeWidth="12" strokeLinecap="round" />
          <rect x="24" y="88" width="28" height="54" rx="10" fill="#ff2e4d" stroke="#141414" strokeWidth="3.5" />
          <rect x="128" y="88" width="28" height="54" rx="10" fill="#ff2e4d" stroke="#141414" strokeWidth="3.5" />
          <path d="M64 114 L76 102 L76 126 Z" fill="#ffe600" stroke="#141414" strokeWidth="2" />
          <path d="M116 114 L104 102 L104 126 Z" fill="#ffe600" stroke="#141414" strokeWidth="2" />
          <text x="90" y="158" textAnchor="middle" fontSize="11.5" fontWeight="900" fill="#141414">+38dB CHEWING</text>
        </svg>
      );

    case 'earbuds':
      return (
        <svg {...common}>
          <path d="M44 96 C26 52, 134 38, 120 92 C106 144, 40 132, 68 78 C96 24, 152 94, 96 128 C52 154, 48 64, 118 68 C154 70, 128 144, 82 104" fill="none" stroke="#141414" strokeWidth="5" strokeLinecap="round" />
          <circle cx="44" cy="96" r="10" fill="#fff" stroke="#141414" strokeWidth="3" />
          <circle cx="136" cy="112" r="10" fill="#fff" stroke="#141414" strokeWidth="3" />
          <rect x="42" y="142" width="96" height="24" rx="5" fill="#ffe600" stroke="#141414" strokeWidth="2.5" />
          <text x="90" y="158" textAnchor="middle" fontSize="11" fontWeight="900" fill="#141414">11D KNOTTED</text>
        </svg>
      );

    case 'shoelace':
      return (
        <svg {...common}>
          <path d="M30 132 C56 64, 94 146, 118 76 C130 42, 150 56, 148 92" fill="none" stroke="#2563eb" strokeWidth="9" strokeLinecap="round" />
          <path d="M30 132 L20 144 M30 132 L28 148 M30 132 L38 146" stroke="#ff2e4d" strokeWidth="3" strokeLinecap="round" />
          <path d="M148 92 L158 104 M148 92 L148 108 M148 92 L139 104" stroke="#ff2e4d" strokeWidth="3" strokeLinecap="round" />
          <rect x="28" y="24" width="124" height="24" rx="5" fill="#ffe600" stroke="#141414" strokeWidth="2.5" />
          <text x="90" y="40" textAnchor="middle" fontSize="10" fontWeight="900" fill="#141414">LEFT SHOE ONLY</text>
        </svg>
      );

    case 'invisible-mug':
    default:
      return (
        <svg {...common}>
          <rect x="48" y="54" width="74" height="86" rx="8" fill="none" stroke="#141414" strokeWidth="3" strokeDasharray="7 6" />
          <path d="M122 72 C146 72, 146 116, 122 116" fill="none" stroke="#141414" strokeWidth="3" strokeDasharray="6 5" />
          <path d="M84 30 C84 78, 86 118, 84 152" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="84" cy="154" rx="44" ry="11" fill="#78350f" stroke="#141414" strokeWidth="2.5" />
          <text x="90" y="22" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#141414">0.00 OZ CAPACITY</text>
        </svg>
      );
  }
}
