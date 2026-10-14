import Image from "next/image";

export function BrandMark({
  className = "h-10 w-10",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/black-flag-logo.png"
      alt=""
      width={318}
      height={318}
      className={`object-contain ${className}`}
      aria-hidden
      priority={priority}
    />
  );
}
