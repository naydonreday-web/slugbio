import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("h-8 w-8", className)} aria-hidden>
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
      <path d="M21 11.5c-1-1.3-2.7-2-4.6-2-2.6 0-4.4 1.4-4.4 3.3 0 4.4 9.4 2.4 9.4 7 0 2-1.9 3.6-4.8 3.6-2.1 0-3.9-.8-5-2.3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 text-foreground", className)} aria-label="SlagBio home">
      <LogoMark />
      <span className="text-[22px] font-extrabold tracking-tighter text-primary">SlagBio</span>
    </Link>
  );
}
