# SlugBio agent instructions

## Project

SlugBio helps creators make interactive campaign posters and share them as link-only pages. Publishing is free at launch. Payments and public discovery are not enabled. See `README.md` for setup, deployment, and launch details, and `roadmap.md` for planned work.

## Local-first workflow

- Work in this repository and keep changes local for review before any GitHub commit.
- Do not commit, push, deploy, or change hosted services unless the user explicitly asks.
- Before editing, inspect the relevant code and existing Git changes. Preserve unrelated user changes.
- Keep changes focused. Explain what changed and list any checks run; do not claim checks that were not run.
- Update `WORKLOG.md` when a durable decision, active-work status, or handoff detail should carry into a later session. Do not use it as a transcript or duplicate routine Git history.

## Coordination with Codex

- Codex and Antigravity work in the same local repository. There is no direct agent-to-agent chat; the user may relay requests, and `WORKLOG.md` is the shared handoff channel.
- At the start of a task, read `WORKLOG.md` and inspect `git status` and the relevant diff before editing. Treat existing uncommitted changes as user work and preserve them.
- Do not edit the shared working tree at the same time as Codex. If another agent's work is in progress, coordinate through the user before touching overlapping files.
- When handing off, update `WORKLOG.md` with the task, files changed, checks run and results, unresolved issues, and a concrete next step. Keep the note short and factual.
- The user reviews local changes before committing. Do not create commits or push changes unless explicitly asked.

## Product and architecture constraints

- User profiles and campaigns belong to the signed-in Supabase account. Browser storage is only a per-account cache. Keep the shared Zod schemas in the Slag library as the client validation source of truth.
- Studio panels (AI assistant, block inspector) are standalone components rendered in desktop side columns at `lg` and inside the bottom `MobileToolbar` below `lg`. Keep one implementation of each panel so mobile and desktop stay consistent.
- Studio selection has two levels: block, then element inside that block. Editable elements and formatting live in `src/lib/slag/elements.ts` and are stored on `block.style.elements`; add editable pieces there so the canvas, inspector, and AI stay in sync.
- Templates are validated data, never executable code. The block registry, template contract, built-ins, storage collections, and Wiby's designer live in `src/lib/slag/templates/`. A single `PosterRenderer` draws templates from `renderLayout()`.
- Templates control presentation; campaigns control content. A campaign stores a template reference and editable theme values. `applyTemplate` must preserve block ids, content, and per-element formatting. Campaigns without a template reference render as Classic.
- The approved template catalog, immutable versions, and review records live in Supabase with row-level security. Keep browser-only job and validation details local; never expose unapproved templates to other accounts.
- Poster text using the theme accent must use `--p-accent-ink` for small text or `--p-accent-display` for large text from `PosterRenderer`, never raw `--p-accent`.
- Image heroes on light poster pages use light text over a deeper scrim. Dark pages keep theme text and fade the photo into the page.
- Responsive grids containing horizontally scrolling rows must use `minmax(0,1fr)` columns and `min-w-0` children so content fits phone screens.
- Supabase credentials and other secrets must not be committed or exposed in browser code. `.env.local` is ignored by Git. Never put a Supabase secret or service-role key in a `VITE_` variable.
- Do not edit generated files when their headers identify them as generated.

## Project commands

Use Node.js 22 or newer and pnpm 11. Common project commands:

```sh
pnpm dev
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm preview
```

Run checks relevant to the change and report their results. Do not deploy as part of local development unless the user asks.
