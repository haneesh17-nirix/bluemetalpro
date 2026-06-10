interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 40 }: LogoIconProps) {
  return (
    <img
      src="/logo-icon.png"
      alt="BlueMetal Pro"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
