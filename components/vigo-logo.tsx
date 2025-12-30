import Image from "next/image";

interface VigoLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function VigoLogo({ width = 140, height = 40, className = "" }: VigoLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Vigo Coffee Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

