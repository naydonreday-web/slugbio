import { cn } from "@/lib/utils";

/** Fixed ambient lighting behind glass panels (Horizon hero gradient + soft blobs). */
export function Ambient({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <div className="bg-ambient absolute inset-x-0 top-0 h-[900px]" />
      <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-sky/25 blur-[120px]" />
      <div className="absolute top-40 -right-40 h-[560px] w-[560px] rounded-full bg-violet/20 blur-[140px]" />
      <div className="absolute bottom-[-200px] left-1/3 h-[520px] w-[520px] rounded-full bg-rose/20 blur-[140px]" />
    </div>
  );
}
