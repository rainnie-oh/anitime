# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Content management
- `/admin` is a separate password-protected editor. Never add an admin link to the public timeline.
- Dates are structured; display labels are generated with `src/date.mjs`. Do not maintain a second free-text date field.
- Saves preserve the published snapshot. Publish replaces it; trash hides it; restore returns a draft.
- `.cms/` stores private content/authentication and must never be committed. `public/uploads/` holds local uploaded images. Back up both together.
- This CMS requires the Node service (`npm start`) or Vite middleware locally; static Sites hosting alone does not supply the API.

## Multitrack experiment
- `/multitrack` shows all regions on shared year coordinates, with one expanded region and compact covers in the others.
- Changing the expanded region preserves the horizontal year position. Do not add a scale disclaimer.
- Keep horizontal navigation in the shared year ruler (or native horizontal gestures / Shift-wheel); vertical input on tracks never changes the year position. Do not switch axes at scroll boundaries or animate scroll compensation.
- Preserve the single-track reading density: bounded-height period collections, sparse periods aligned at the top, and independent scrolling for dense collections. Avoid global maximum-height rows.
- Period boundaries share year coordinates; covers form collections inside their periods, with structured date captions. Do not add cover stems, dashed guides, or range lines.
- Keep Overview available for all regions; selecting a period enters its region and time position.

- Overview is the same shared timeline compressed: one row per region, period names only, aligned with the region name. Remove work counts on tracks and all Overview summaries/counts. Animate the shared period positions between modes.
- Start both views at the earliest period containing published works; omit earlier empty historical spans (currently 793).

- Remove the context region/period summaries and scrolling instruction copy. Vertical mouse-wheel input over region titles, period labels, compact covers, and track whitespace moves the shared horizontal timeline; only expanded work collections scroll vertically. Horizontal trackpad input always moves the shared timeline. No axis switching at collection boundaries.

- Temporarily hide the top TIMELINE/year context without removing its layout space. The nearest ruler year receives red emphasis and smooth enlargement during horizontal browsing, matching the single-track focus behavior. Overview period names retain the same square markers as Timeline.

- Hide scrollbars inside period work collections. Indicate remaining vertical content with a white bottom fade; remove the fade at the bottom or when the collection fits. Keep the overlay pointer-transparent.

- Compact tracks keep all period names on a single baseline; do not reuse expanded period overlap rows or full-span heading widths. Keep just a 4px gap between the compact period band and thumbnail band.

## Brand wordmark
- Use outlined Archivo ExtraBold (wght 800, wdth 100), uppercase ANITIME only; never substitute a system font. Tracking is -0.06em with default kerning and optical centering of both I glyphs.
- Both I glyphs use design red #E53E3E; other glyphs are pure black on pure white. No subtitle or decoration. Disable blend effects that alter these colors.
- Keep at least half the cap height of clear space. Brand exports live in public/brand; reproducible source and OFL license live in scripts/brand. Favicon uses only a centered black Archivo A.

- Overview uses an agency/editorial composition: remove its reserved context/footer height, divide the space below Navbar and shared ruler equally among regions, use oversized region names and larger period labels. Keep period labels and region names on a common vertical center, original square markers, and the same shared coordinates. Small screens retain horizontal browsing.

- Overview and Timeline share the exact ruler height. Overview region names are restrained (28px desktop), all period labels use 16px; solve collisions with shared horizontal spacing, never by shrinking long names. Region-name hover makes the whole lane red with white labels; period hover highlights that label in red/white.

- Overview hover must stay quiet: pale gray lane background, red hovered text/marker, no full red backgrounds or white text. Add small numeric badges after period names for published work counts; these are secondary and do not reintroduce separate summary text.

- Shared ruler, track content, separators, and lane hover backgrounds span the full viewport width. Apply horizontal inset to region labels rather than the track container; Navbar keeps its existing padding. Measure the full root width for shared Overview coordinates.

- Multitrack navigation arrows must reuse the original SVG chevrons (without horizontal shafts), never Unicode text arrows.
- Period count badges use zero border radius and align to the period text baseline with a small optical correction; avoid vertical-align:middle with mixed font sizes.

## Series timeline
- Series links sit below card dates and isolate the series; clearing restores the prior browsing position and region. Keep node appearance and interaction consistent in filtered and full views.
- Separate adaptations/parts with their own posters (including TV versus films). A shared-poster anthology uses a poster at its earliest story era and text nodes for later eras, retaining series identity. Order by story era, not broadcast order.
- Use approximate period labels for inferred eras; never invent an exact year for placement. Do not connect distant nodes with century-spanning lines.

- Series navigation is inline: the series link becomes 返回 when active; no top filter banner. Multitrack series mode compresses unused years to fit the cards and retains unrelated regions as blurred, faded context. Animate entry/return and restore the prior browsing position.

- Active series has exactly one return link beside the expanded region heading, with its series name. Hide all card and detail series links while filtered. The heading stays independent of horizontal timeline scrolling.

## Swiss design experiment
- Use Swiss principles to improve alignment, typographic hierarchy and purposeful spacing, while preserving timeline browsing and informative artwork. Do not impose a twelve-column grid on historical coordinates or enlarge every gap indiscriminately.
- Approved multitrack styling: top whitespace 64px, period type 14px, caption type 12px, year type 42px, time width 105%, artwork 164px and collection gap 12px. Dashboard is removed; both Timeline and Overview share these fixed tokens. Keep functional state feedback and readable year spacing.
- This experiment belongs to the multitrack-view worktree and /multitrack page. Preserve shared year coordinates, compact baselines, bounded collections, outlined brand wordmark and quiet hover feedback.

## Work detail layout
- Keep only the original work detail layout. The reference variant and layout switcher were rejected and removed; do not reintroduce them.

## UI and editorial polish
- Treat UI design and copywriting as separate passes; do not rewrite catalog descriptions during UI polish.
- Overview reserves measured space for each whole period name and count, on one baseline, using shared coordinates across regions. Prefer horizontal browsing over splitting names or shrinking type.
- Original work detail uses an opaque white background. Replace source metadata labels with one official-link CTA: small-radius black rectangle with white text and a dotted right arrow, matching the user screenshot; no circular icon or sliding effect. Keep keyboard focus visible and disable nonessential movement with reduced-motion preferences. Preserve the existing React/CSS stack.

- Official-link CTA motion uses two copies of the label: left copy scales out as the right copy scales in on hover, reversing on leave, in rhythm with the staggered dots. Pressing scales the whole button. Keep duplicate text aria-hidden and respect reduced motion.

## Editorial voice
- Use Traditional Chinese throughout public pages and the editor; preserve original Japanese titles and stable IDs/URLs.
- Work descriptions should read like a personally curated animation guide: concrete story hooks and selective recommendation, with playful language only where the work supports it. Serious historical and dramatic works remain restrained. Avoid repetitive “set against / presents” formulas, generic praise, spoilers, and unsupported historical precision. Preserve date evidence, adaptation distinctions, and fictional-setting qualifications.

- The first full editorial rewrite was rejected as too AI-like. Restore factual original descriptions in Traditional Chinese. Do not bulk-expand them with recommendation formulas, emotional conclusions, or invented personal opinions. Future tone edits should be short, specific, and close to the user’s own wording.

- Do not append explanations of which characters, settings, or events are fictional to work descriptions. Keep useful historical context and edition details, and let the story introduction read naturally.

## Copy versions
- CMS keeps immutable V1 (complete original generated text) and V2 (the edited copy as of 2026-10-08) in server/copy-versions.json. Preserve V1 verbatim, including its original script.
- Named copy versions store descriptions only, keyed by stable work IDs. Loading a version changes drafts only, preserves published snapshots and other metadata, and automatically saves the preceding descriptions. Public API must never expose version history.
- User rejected the editorial conclusions about the children’s daily needs in Grave of the Fireflies, the “hotter than the stove” joke and broadcast-date explanation in Iron Wok Jan. Remove those phrases from the final V2; avoid this tone in future writing.

## Series poster stacks
- In the multitrack timeline, group multiple entries only within the same region, historical period and series. Single entries stay ordinary cards. Keep separate eras separate, even if their collections overlap.
- Use up to three overlapping posters with side artwork exposed and slight rotations (-5°, -2°, +4°). No white frame; use a fine translucent black outline and light shadow. Dates and labels stay horizontal.
- Clicking a stack enters existing series focus; all entries expand with their individual posters and dates. Use reversible movement and fading, respect reduced motion, and keep one return beside the region heading. Restore scroll and keyboard focus on return.
- Individual cards must open the existing WorkDetail template, never the concept demo dialog.
