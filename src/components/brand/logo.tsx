import Link from "next/link";
import Image from "next/image";

// Single shared logo asset (899x544) — never hard-code the image path or
// aspect ratio in a page; every logo on the platform should render through
// this component so it stays proportional and consistent everywhere.
const LOGO_ASPECT = 899 / 544;

const sizes = {
  sm: 28,
  md: 36,
  lg: 48,
} as const;

export function Logo({
  size = "md",
  href = "/",
  className = "",
}: {
  size?: keyof typeof sizes;
  /** Where the logo links to. Pass null to render a non-clickable mark. */
  href?: string | null;
  className?: string;
}) {
  const height = sizes[size];
  const width = Math.round(height * LOGO_ASPECT);

  const image = (
    <Image
      src="/logo-full.png"
      alt="Educom"
      width={width}
      height={height}
      className={`h-auto w-auto ${className}`}
      style={{ height, width: "auto" }}
      priority={size === "lg"}
    />
  );

  if (href === null) return image;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Educom home">
      {image}
    </Link>
  );
}
