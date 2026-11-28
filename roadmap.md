# Roadmap

- [x] Studio: click a button, title, text or image to select that exact element (not the whole block), with breadcrumbs and focused controls
- [x] Studio: text formatting for elements — font, bold, italic, underline
- [x] Header: remove the Create button, add a Campaigns nav icon; one Create action on home
- [x] Home as a dashboard: show 2 recent campaigns, link to a dedicated All campaigns page
- [x] New /campaigns page listing every campaign
- [x] Test desktop + mobile flows
- [x] Wizard step 1: "Use new template" button — Wiby designs a new template (universal template architecture, browser storage for now)
- [x] Block visual style system part 1: style registry (50 styles), 8 creative profiles, Wiby style selection, templates accept style ids
- [x] Studio style picker with content requirements and offer end-date control
- [x] AI chat style commands and Wiby dialog "why this design" notes
- [x] `/styles` gallery with live campaign previews
- [x] Renderer respects per-block style choices and includes distinct hero, image, offer, details, CTA, and footer treatments
- [x] Style gallery focuses each sample on the selected block while keeping full campaign context for content requirements
- [x] Automated resolution and missing-content fallback checks cover all 50 registered style ids
- [ ] Style-by-style visual review and missing-content fallback coverage across mobile and desktop
- [x] Publish hostname and QR code links follow the active deployed site origin after hydration
- [x] Supabase template storage with immutable versions, owner-scoped submissions, and admin review screen
- [x] Current production build passes Wrangler dry-run upload check (2,963 KiB total, 648 KiB gzipped)
- [x] Local Cloudflare Worker serves the dashboard, style gallery, sign-in page, and robots.txt
- [x] Add a privacy notice, account self-deletion with password confirmation, and campaign-owner response deletion UI
- [x] Deploy the password-confirmed `delete-account` Supabase Edge Function with JWT verification and session revocation
- [x] Apply and verify the public campaign rate-limit/analytics and response-delete migrations
- [x] Deploy `campaign-public` and smoke-check its invalid-campaign response
- [x] Set the privacy notice operator and contact email in the local build environment
- [ ] Production launch gates: deploy to the assigned `workers.dev` hostname, configure SMTP/Auth redirects, and enable breached-password protection

## Queued fixes

- [x] Publishing slug check & persistence: use an owner-validated `SECURITY DEFINER` RPC for global slug availability, await the cloud save before opening the share dialog, and show a clear conflict message if another account claims the slug during publishing.
- [x] Public pending Wiby templates: allow `/c/$slug` visitors to read a template version referenced by any published campaign, including link-only campaigns with `visibility = 'private'`.
- [x] Studio auto-save: skip the initial unchanged document and flush a pending debounced edit on unmount/navigation.
- [x] Public route slug transitions: avoid showing stale remote campaigns while a new slug loads and track views once per campaign.
- [x] PosterRenderer visual styles: fix polaroid caption contrast and image selection rings; complete collage, burst, sticker, calendar, and location treatments.
- [x] Cleanup & branding: update the public URL fallback to `slug.bio`, guard malformed `VITE_PUBLIC_SITE_URL`, and remove unused `public/favicon1.ico`. Starter form blocks intentionally omit creator-specific Google Forms responder URLs; the editor asks creators to provide one and publishing validates it, so no fake URL is seeded.
