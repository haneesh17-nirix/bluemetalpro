interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 40 }: LogoIconProps) {
  const ring = Math.round(size * 0.08);   // ring stroke thickness scales with size
  const r = (size - ring) / 2;            // radius of ring circle
  const cx = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Circular-clipped logo image */}
      <img
        src="/logo-icon.png"
        alt="BlueMetal Pro"
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* SVG golden ring overlay — crisp metallic bevel */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          {/* Metallic gold gradient rotating around the circle */}
          <linearGradient id={`gold-ring-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ffe680" />
            <stop offset="18%"  stopColor="#c89018" />
            <stop offset="40%"  stopColor="#f0c840" />
            <stop offset="58%"  stopColor="#9a6c0a" />
            <stop offset="75%"  stopColor="#e8c040" />
            <stop offset="88%"  stopColor="#c89018" />
            <stop offset="100%" stopColor="#ffe680" />
          </linearGradient>
          {/* Inner shadow — dark line just inside the ring for depth */}
          <filter id={`ring-glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation={Math.max(1, size * 0.025)} floodColor="#c89018" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Outer dark groove — gives the ring a recessed-metal look */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth={ring + 2}
        />
        {/* Main gold ring */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={`url(#gold-ring-${size})`}
          strokeWidth={ring}
          filter={`url(#ring-glow-${size})`}
        />
        {/* Inner highlight — thin bright line on the inside edge of the ring */}
        <circle
          cx={cx} cy={cx} r={r - ring / 2 + 0.5}
          fill="none"
          stroke="rgba(255,240,140,0.45)"
          strokeWidth={0.8}
        />
      </svg>
    </div>
  );
}
