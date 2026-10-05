# ANITIME wordmark

Archivo ExtraBold, weight 800, width 100; real font outlines, no runtime font dependency. Source: https://github.com/google/fonts/tree/main/ofl/archivo (OFL license and variable font retained in scripts/brand).

Tracking: -0.06em; HarfBuzz default kerning enabled. Optical I offsets: third letter -0.025696em, fifth letter +0.024261em. Overall word width is preserved. Adjacent visible gaps around the two I glyphs are respectively 0.064241em and 0.065285em.

Red: #E53E3E, matching the timeline design system. The two red I glyphs represent two nodes on a timeline; everything else remains restrained.

- anitime-white.svg: pure white background, black letters, red I.
- anitime-black.svg: pure black background, white letters, identical red I.
- anitime-mono.svg: all-black paths, transparent background for one-color printing.
- *-transparent.svg: background-free counterparts.
- *-2048.png: transparent PNG counterparts, 2048px wide (white means intended for white/light surfaces; black means intended for black/dark surfaces).
- favicon.svg and favicon-{16,32,180,512}.png: geometrically centered black Archivo A.
- check-32.png: 16px capital height plus 8px clear space above/below.
- check-16.png: entire canvas 16px tall (8px capital height), stricter supplementary check.
- check-160.png: large review preview.

Every wordmark canvas has exactly 50% capital-height clear space on all sides. Favicon uses the same vertical clearance and at least that much horizontally. Both red I strokes remain separately visible in the 16px-cap-height raster check and in the supplementary 16px-canvas check.

Applied to both public headers in the multitrack-view worktree. Desktop cap height 24px, mobile 20px. Header color blending is disabled to preserve the exact ink colors. Production build passed; local multitrack header visually verified.

Regenerate outlines with scripts/brand/generate.py (fonttools, uharfbuzz). metrics.json records source units and spacing.
