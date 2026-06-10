interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 52 }: LogoIconProps) {
  const ring = Math.round(size * 0.035);
  const r = (size - ring) / 2;
  const cx = size / 2;
  const id = `gr${size}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Inner backlight — warm amber glow from behind the logo */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 55%, rgba(233,205,138,0.55) 0%, rgba(223,193,133,0.28) 45%, transparent 72%)',
        zIndex: 0,
      }} />
      <img
        src="/logo-icon.png"
        alt="BlueMetal Pro"
        width={size}
        height={size}
        style={{
          display: 'block',
          position: 'relative',
          zIndex: 1,
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center',
          filter: 'brightness(1.35) contrast(1.05)',
        }}
      />

      {/* Unpolished matte gold ring — warm dark tones, low contrast, rough feel */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 2 }}
      >
        <defs>
          {/* Matte gold — warm ochre tones, subtle variation, no bright flash */}
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#d0b890" />
            <stop offset="30%"  stopColor="#bda888" />
            <stop offset="55%"  stopColor="#dcc494" />
            <stop offset="75%"  stopColor="#b5a084" />
            <stop offset="100%" stopColor="#cdb88c" />
          </linearGradient>
        </defs>

        {/* Dark groove behind ring for depth */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(128,128,128,0.6)" strokeWidth={ring + 2} />
        {/* Matte gold ring */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={ring} />
        {/* Very faint inner edge line */}
        <circle cx={cx} cy={cx} r={r - ring / 2 + 0.5} fill="none" stroke="rgba(228,208,158,0.2)" strokeWidth={0.7} />
      </svg>
    </div>
  );
}
