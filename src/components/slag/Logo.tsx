import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.ico?v=20261127"
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn("h-8 w-8 shrink-0 object-contain", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 text-foreground", className)} aria-label="SlugBio home">
      <LogoMark />
      <span className="text-[22px] font-extrabold tracking-tighter text-primary">SlugBio</span>
    </Link>
  );
}
