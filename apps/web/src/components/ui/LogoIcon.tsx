interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 40 }: LogoIconProps) {
  return (
    <img
      src="/logo-icon.svg"
      alt="BlueMetal Pro"
      width={size}
      height={Math.round(size * 560 / 500)}
      style={{ display: 'block' }}
    />
  );
}
