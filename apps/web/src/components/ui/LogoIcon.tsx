interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 52 }: LogoIconProps) {
  const ring = Math.round(size * 0.07);
  const r = (size - ring) / 2;
  const cx = size / 2;
  const id = `gr${size}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
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

      {/* Unpolished matte gold ring — warm dark tones, low contrast, rough feel */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          {/* Matte gold — warm ochre tones, subtle variation, no bright flash */}
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#a07020" />
            <stop offset="30%"  stopColor="#7a5010" />
            <stop offset="55%"  stopColor="#b88828" />
            <stop offset="75%"  stopColor="#6a4008" />
            <stop offset="100%" stopColor="#9a7018" />
          </linearGradient>
        </defs>

        {/* Dark groove behind ring for depth */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={ring + 2} />
        {/* Matte gold ring */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={ring} />
        {/* Very faint inner edge line */}
        <circle cx={cx} cy={cx} r={r - ring / 2 + 0.5} fill="none" stroke="rgba(200,160,60,0.2)" strokeWidth={0.7} />
      </svg>
    </div>
  );
}
