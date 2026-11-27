import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CustomCursor } from "@/components/slag/CustomCursor";
import { useAuth } from "@/lib/supabase/use-auth";
import { setAuthenticatedUser } from "@/lib/slag/store";
import { setTemplateAuthenticatedUser } from "@/lib/slag/templates/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ambient px-4">
      <div className="max-w-md text-center">
        <h1 className="text-display-xl text-foreground">404</h1>
        <h2 className="mt-4 text-headline-md text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ambient px-4">
      <div className="max-w-md text-center">
        <h1 className="text-headline-md text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="glass inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SlugBio — AI campaign posters you can share as a link" },
      {
        name: "description",
        content:
          "Answer a few questions, get a beautiful interactive poster, edit it with AI and publish it as a shareable link.",
      },
      { name: "author", content: "SlugBio" },
      { property: "og:title", content: "SlugBio — AI campaign posters you can share as a link" },
      {
        property: "og:description",
        content:
          "Answer a few questions, get a beautiful interactive poster, edit it with AI and publish it as a shareable link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700;1,800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400;1,9..144,700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico?v=20261127", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="overflow-x-hidden">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { user } = useAuth();

  useEffect(() => {
    setAuthenticatedUser(user?.id ?? null);
    setTemplateAuthenticatedUser(user?.id ?? null);
  }, [user?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Outlet />
        <footer className="relative z-10 px-4 pb-5 text-center text-xs text-muted-foreground">
          <Link to="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
        </footer>
        <CustomCursor />
        <Toaster position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
