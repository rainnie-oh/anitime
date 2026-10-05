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
