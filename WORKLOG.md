# SlugBio worklog

Use this file for durable decisions, current work, and handoff notes. Keep entries brief; Git history is the detailed change log.

## Current status — 2026-11-28

- Local development is the review stage; changes are reviewed before any GitHub commit.
- Antigravity is part of the development workflow. Lovable is retired and no longer manages this project.
- The repository was clean on `main` at commit `d294a3d` (`Replace SlagBio branding with SlugBio`) when this worklog was created.
- Implemented the six queued pre-launch review items in `roadmap.md`: publishing slug validation/persistence, public template access, studio autosave flush, public route slug transitions, poster style treatments, and branding/config cleanup. The fallback share domain is `slug.bio` per user direction.
- Starter form blocks still require the creator's own Google Forms responder URL by design; publishing validates that value. The unused `public/favicon1.ico` was removed.
- The work remains local and uncommitted. Prettier formatting was applied to the edited renderer, store, data, and route files; application tests and builds were not run.
- Current security fix is implemented locally: remove the anon-readable `public_campaigns` view and serve published campaign posters through the IP-rate-limited `campaign-public` Edge Function. The migration and function are not deployed; apply them alongside a frontend release that includes the updated client, since the currently deployed frontend still queries the view.
- **Next step:** Review the local diff and run the project's requested checks before deciding whether to commit.

## Ongoing decisions

- Keep project-wide agent guidance in `AGENTS.md`.
- Keep `roadmap.md` for planned product work; do not duplicate its checklist here.
- Make and review changes locally before committing them to GitHub. Commit or push only when explicitly requested.
