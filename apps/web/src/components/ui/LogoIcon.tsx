interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 40 }: LogoIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 132" width={size} height={size * 132 / 120}>
      <defs>
        <linearGradient id="li-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0c83a"/>
          <stop offset="35%" stopColor="#d4a020"/>
          <stop offset="65%" stopColor="#c89018"/>
          <stop offset="100%" stopColor="#a87010"/>
        </linearGradient>
        <linearGradient id="li-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8b828"/>
          <stop offset="50%" stopColor="#c48c14"/>
          <stop offset="100%" stopColor="#9a6808"/>
        </linearGradient>
        <linearGradient id="li-shield" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3f7a"/>
          <stop offset="100%" stopColor="#132a5a"/>
        </linearGradient>
        <linearGradient id="li-green" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#1e6830"/>
          <stop offset="100%" stopColor="#2ea848"/>
        </linearGradient>
      </defs>

      {/* Shield body */}
      <path d="M60 4 L110 20 L110 72 Q110 108 60 126 Q10 108 10 72 L10 20 Z" fill="url(#li-shield)"/>
      {/* Shield gold border */}
      <path d="M60 4 L110 20 L110 72 Q110 108 60 126 Q10 108 10 72 L10 20 Z" fill="none" stroke="url(#li-gold)" strokeWidth="2.5"/>
      {/* Inner highlight */}
      <path d="M60 10 L104 24 L104 72 Q104 104 60 120 Q16 104 16 72 L16 24 Z" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

      {/* B left spine */}
      <rect x="24" y="18" width="12" height="74" rx="3" fill="url(#li-gold-v)"/>

      {/* B upper bump outer */}
      <path d="M36 18 Q74 18 74 36 Q74 54 36 54 Z" fill="url(#li-gold)"/>
      {/* B upper bump inner — mountain cavity */}
      <path d="M36 23 Q68 23 68 37 Q68 50 36 50 Z" fill="#152e68"/>
      {/* Mountain peaks */}
      <polygon points="36,50 44,38 49,42 54,31 59,36 63,27 68,36 68,50" fill="#1a3a7a"/>
      <polygon points="54,31 59,27 65,31 68,31 68,26 62,21 56,25 50,21 44,29 49,33" fill="#1e4488"/>
      {/* Snow highlights */}
      <polygon points="63,21 59,27 66,27" fill="rgba(255,255,255,0.18)"/>
      <polygon points="50,21 46,27 53,25" fill="rgba(255,255,255,0.12)"/>
      {/* Mountain shadow base */}
      <path d="M36 44 Q68 44 68 50 L36 50 Z" fill="#0f2255" opacity="0.5"/>

      {/* B lower bump outer (slightly larger) */}
      <path d="M36 56 Q78 56 78 72 Q78 90 36 90 Z" fill="url(#li-gold)"/>
      {/* B lower bump inner — bar chart cavity */}
      <path d="M36 61 Q72 61 72 72 Q72 85 36 85 Z" fill="#152e68"/>
      {/* Green bar chart */}
      <rect x="43" y="73" width="7" height="11" rx="1.5" fill="url(#li-green)"/>
      <rect x="52" y="67" width="7" height="17" rx="1.5" fill="url(#li-green)"/>
      <rect x="61" y="70" width="7" height="14" rx="1.5" fill="url(#li-green)"/>
    </svg>
  );
}
