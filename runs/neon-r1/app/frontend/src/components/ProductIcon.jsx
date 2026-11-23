import React from "react";

export function ProductIcon({ type, accent = "#ff2a6d" }) {
  const common = {
    width: 96,
    height: 96,
    viewBox: "0 0 96 96",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };

  switch (type) {
    case "paperclip":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <path
            d="M34 66L58 24C62 17 72 22 68 30L46 66C43 71 36 67 39 62L55 34"
            stroke="#111"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="M55 34L66 44" stroke={accent} strokeWidth="6" strokeLinecap="round" />
          <circle cx="66" cy="44" r="5" fill="#ffe600" stroke="#111" strokeWidth="2.5" />
        </svg>
      );
    case "wifi":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <path d="M24 44C38 30 58 30 72 44" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeDasharray="6 6" />
          <path d="M34 54C42 46 54 46 62 54" stroke="#111" strokeWidth="5" strokeLinecap="round" />
          <circle cx="48" cy="65" r="5" fill="#ff2a6d" stroke="#111" strokeWidth="3" />
          <line x1="22" y1="74" x2="74" y2="22" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <path
            d="M24 62H68C74 62 78 57 78 51C78 45 73 41 67 41C65 32 57 26 48 26C38 26 30 33 29 43C23 44 19 48 19 53C19 58 21 62 24 62Z"
            fill="#f3e8ff"
            stroke="#111"
            strokeWidth="4"
          />
          <text x="48" y="53" textAnchor="middle" fontSize="13" fontWeight="900" fill="#111">
            AIR™
          </text>
        </svg>
      );
    case "brick":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <rect x="18" y="34" width="60" height="34" rx="4" fill="#ea580c" stroke="#111" strokeWidth="4" />
          <circle cx="33" cy="51" r="4" fill="#111" />
          <circle cx="48" cy="51" r="4" fill="#111" />
          <circle cx="63" cy="51" r="4" fill="#111" />
          <text x="48" y="27" textAnchor="middle" fontSize="11" fontWeight="900" fill="#dc2626">
            NO WI-FI
          </text>
        </svg>
      );
    case "earbuds":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <path
            d="M26 32C40 16 70 46 42 54C20 60 56 80 68 58C76 44 36 28 32 68"
            stroke="#111"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="26" cy="32" r="7" fill={accent} stroke="#111" strokeWidth="3" />
          <circle cx="32" cy="68" r="7" fill="#ffe600" stroke="#111" strokeWidth="3" />
        </svg>
      );
    case "mug":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <path d="M30 42H62V70C62 73 59 76 56 76H36C33 76 30 73 30 70V42Z" fill="#fef08a" stroke="#111" strokeWidth="4" />
          <path d="M62 48H70C74 48 76 51 76 56C76 61 74 64 70 64H62" stroke="#111" strokeWidth="4" />
          <path d="M38 36C38 24 44 20 44 16M50 36C50 24 56 20 56 16" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <rect x="18" y="24" width="60" height="50" fill="#fde68a" stroke="#111" strokeWidth="4" />
          <rect x="30" y="34" width="36" height="30" fill="#fbcfe8" stroke="#111" strokeWidth="3" />
          <rect x="40" y="42" width="16" height="14" fill="#bae6fd" stroke="#111" strokeWidth="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="8" y="8" width="80" height="80" rx="14" fill="#fff" stroke="#111" strokeWidth="4" />
          <path
            d="M48 20C48 20 70 46 70 60C70 72 60 78 48 78C36 78 26 72 26 60C26 46 48 20 48 20Z"
            fill="#bae6fd"
            stroke="#111"
            strokeWidth="4"
          />
          <text x="48" y="62" textAnchor="middle" fontSize="12" fontWeight="900" fill="#111">
            H2O
          </text>
        </svg>
      );
  }
}
