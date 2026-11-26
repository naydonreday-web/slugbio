<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- Responsive grids that hold horizontally scrolling rows must use `minmax(0,1fr)` columns (and `min-w-0` children); a bare `grid` or `1fr` column grows to the row's full width and pushes content off phone screens.
- User profile and campaign records are owned by the signed-in Supabase account; browser storage is only a per-account cache. Keep the shared zod schemas in the slag lib as the client validation source of truth.
- Studio panels (AI assistant, block inspector) are standalone components rendered in the desktop side columns at `lg` and inside the bottom `MobileToolbar` below `lg` — one implementation per panel so phone and desktop never drift.
- Poster text that uses the theme accent reads `--p-accent-ink` (small text) or `--p-accent-display` (large text) from `PosterRenderer`, never raw `--p-accent` — they fall back to the text colour when the accent fails contrast, so AI colour changes can't make text unreadable.
- Image heroes on light poster pages render light text over a deeper scrim; dark pages keep theme text and fade the photo into the page — dark theme text over a darkened photo is unreadable.
- Studio selection is two-level (block, then element inside it); the selectable elements per block type and their formatting live in `src/lib/slag/elements.ts` and are stored on `block.style.elements` — add new editable pieces there so canvas, inspector and AI stay in sync.
- Templates are validated data, never code: the block registry, template contract (zod), built-ins, storage collections and Wiby's designer live in `src/lib/slag/templates/`, and the single `PosterRenderer` draws every template from `renderLayout()` — so new templates never need a new component and can't inject CSS or scripts.
- Templates control presentation and campaigns control content: a campaign stores only a `template` reference plus editable theme values, and `applyTemplate` must keep block ids, content and per-element formatting; campaigns without a reference render as Classic, unchanged.
- The approved template catalog, immutable versions, and review records live in Supabase with row-level security. Browser-only job and validation details may remain local; never expose unapproved templates to other accounts.
