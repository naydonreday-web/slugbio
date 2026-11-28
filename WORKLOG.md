# SlugBio worklog

Use this file for durable decisions, current work, and handoff notes. Keep entries brief; Git history is the detailed change log.

## Current status — 2026-11-28

- Local development is the review stage; changes are reviewed before any GitHub commit.
- Antigravity is part of the development workflow. Lovable is retired and no longer manages this project.
- The repository was clean on `main` at commit `d294a3d` (`Replace SlagBio branding with SlugBio`) when this worklog was created.
- Implemented the six queued pre-launch review items in `roadmap.md`: publishing slug validation/persistence, public template access, studio autosave flush, public route slug transitions, poster style treatments, and branding/config cleanup. The fallback share domain is `slug.bio` per user direction.
- Starter form blocks still require the creator's own Google Forms responder URL by design; publishing validates that value. The unused `public/favicon1.ico` was removed.
- The six pre-launch fixes were committed in `d3fe52a` and pushed to `main`.
- The security fix was committed and pushed in `5d9f1e0`. The `campaign-public` Edge Function was deployed from the Supabase dashboard, the Cloudflare Worker was deployed as version `e2528444-e419-4ee0-b0c2-87b1731b02d8`, and `public.public_campaigns` was dropped through the Supabase SQL Editor after the frontend release.
- `pnpm deploy` completed successfully, including the production build. `git diff --check` passed before release. The project test suite and lint were not run.
- **Next step:** Monitor public campaign links and confirm the Supabase Security Advisor no longer reports `public.public_campaigns`.

## Ongoing decisions

- Keep project-wide agent guidance in `AGENTS.md`.
- Keep `roadmap.md` for planned product work; do not duplicate its checklist here.
- Make and review changes locally before committing them to GitHub. Commit or push only when explicitly requested.
