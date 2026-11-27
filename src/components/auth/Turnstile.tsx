import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "auto" | "light" | "dark";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cloudflare-turnstile-api";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
};

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
      window.clearInterval(pollId);
    };

    const pollId = window.setInterval(mount, 100);
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = mount;
      document.head.appendChild(script);
    } else {
      mount();
    }
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      onTokenRef.current(null);
    };
  }, [siteKey]);

  return <div ref={containerRef} className="min-h-[65px]" aria-label="Security verification" />;
}
