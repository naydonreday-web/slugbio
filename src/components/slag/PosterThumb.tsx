import { useEffect, useRef, useState } from "react";
import { PosterRenderer } from "./poster/PosterRenderer";
import type { TemplateConfig } from "@/lib/slag/templates/schema";
import type { Campaign } from "@/lib/slag/types";
import { cn } from "@/lib/utils";

/** Scaled-down, non-interactive poster render used for cards and summaries. */
export function PosterThumb({
  campaign,
  template,
  className,
  width = 390,
  focusBlockId,
}: {
  campaign: Pick<Campaign, "theme" | "blocks" | "title"> &
    Partial<Pick<Campaign, "template" | "slug">>;
  template?: TemplateConfig;
  className?: string;
  width?: number;
  focusBlockId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / width));
    ro.observe(el);
    setScale(el.clientWidth / width);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      style={{ background: campaign.theme.bg }}
      aria-hidden
    >
      {scale > 0 && (
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{ width, transform: `scale(${scale})` }}
        >
          <PosterRenderer
            campaign={campaign}
            template={template}
            focusBlockId={focusBlockId}
            mode="thumb"
          />
        </div>
      )}
    </div>
  );
}
