# SlagBio

SlagBio helps Lesotho-based creators make interactive campaign posters and share them as link-only pages. Publishing is free at launch. Payments and public discovery are not enabled.

## Local development

Use Node.js 22 or newer and pnpm 11. Install dependencies and configure the Supabase browser credentials:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_SITE_URL`, `VITE_OPERATOR_NAME`, and `VITE_PRIVACY_CONTACT_EMAIL` in `.env.local`. The optional `VITE_TURNSTILE_SITE_KEY` enables Cloudflare Turnstile on sign-in, sign-up, and password reset; configure the matching private secret in Supabase Auth before enabling CAPTCHA there. The publishable key and Turnstile site key are designed for browser use; never put a Supabase secret, service-role key, or Turnstile secret in a `VITE_` variable. `.env.local` is ignored by Git.

## Supabase

The project schema is managed through migrations in `supabase/migrations`. To link a local Supabase CLI to the existing project, authenticate with the Supabase CLI and run:

```sh
pnpm dlx supabase link --project-ref athqirhjijncworswkvq
pnpm dlx supabase db push
```

Template submissions are validated by the app and saved as immutable versions. They remain private to their creator until an administrator approves them in **Template review**. To grant an account review access, set the user's trusted `app_metadata` in Supabase Auth to `{ "role": "admin" }`, then sign out and back in so the new claim is loaded. Do not use editable `user_metadata` for this role.

The `delete-account` Edge Function verifies the signed-in user's password, revokes sessions, then deletes their account. `campaign-public` records public campaign metrics and rejects retired SlagBio form submissions; its database rate limiter is defined in `supabase/migrations`. Both functions are deployed to the configured Supabase project. Redeploy them with `pnpm dlx supabase functions deploy delete-account` and `pnpm dlx supabase functions deploy campaign-public` after linking the CLI. Never put a Supabase secret key in client code.

In Supabase Auth settings, configure the production Site URL and allowed redirect URLs for the deployed hostname. Configure a production SMTP provider before opening email sign-up to the public; the built-in email sender is intended for development and has strict limits. Keep email confirmation enabled and turn on leaked-password protection. For CAPTCHA, create a Turnstile widget for the deployed hostname, set its site key as `VITE_TURNSTILE_SITE_KEY` in the production build environment, enter its secret directly in Supabase Auth, and only then enable CAPTCHA protection.

## Production build and deployment

The app builds as a Cloudflare Worker using the TanStack Start and Nitro Cloudflare preset:

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm preview
pnpm deploy
```

The Worker name is `go`, so Cloudflare serves it at `go.slugbio.workers.dev` when `workers.dev` is enabled for the account.

Wrangler is a pinned project dependency. Authenticate from a trusted terminal with `pnpm exec wrangler login`, then run `pnpm deploy`. The first deploy prints the assigned workers.dev URL.

The `VITE_*` values are baked into the bundle at build time. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_OPERATOR_NAME`, `VITE_PRIVACY_CONTACT_EMAIL`, and the exact assigned `VITE_PUBLIC_SITE_URL` in `.env.local` before `pnpm deploy` (or in the CI environment that runs the build). Add the deployed host to Supabase Auth's Site URL and redirect allow-list. Run a preview deployment and verify sign-up, email confirmation, sign-in, campaign save/edit/delete, link publishing, and Google Forms responder links before directing users to production.

## Launch decisions

- First market: Lesotho (`+266`, currency `M`, VAT assumption 15%).
- Publishing: free initially; payment collection is not implemented.
- Public campaigns are link-only. There is no discovery directory.
- Authentication and campaign data use Supabase with row-level security.

## Stack

- TanStack Start, React, TypeScript, and Tailwind CSS
- Supabase Auth and Postgres
- Nitro deployment preset for Cloudflare Workers
