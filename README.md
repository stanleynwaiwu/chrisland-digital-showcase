# Chrisland Experience — Project Foundation

Digital signage experience for Chrisland University. Vanilla HTML5 / CSS3 / ES6 — no frameworks, no build step.

## Running it

Open `index.html` with Live Server (or any static file server — ES modules require `http://`, not `file://`).

## Structure

```
index.html            Display shell: loading screen + 5-layer stage
css/
  variables.css        Design tokens — colours, type, spacing, shadows, timing, z-index
  main.css              Reset, base elements, TV scaling, loading screen
  layout.css             Reusable layout utilities (hero, split, grid, center, cards)
  animations.css          Reusable keyframes (fade, slide, scale, blur, glow, sweep, float, pulse)
js/
  app.js                Boots the app: loads data, wires engines, hides loading screen
  scene-engine.js         Scene lifecycle skeleton: init/load/next/prev/start/stop/restart
  animation-engine.js      Thin helpers over animations.css (fadeIn, slideUp, lightReveal, etc.)
  asset-manager.js          Image/video loading with automatic placeholder fallback
data/
  settings.json           Display + branding + timing configuration
  scenes.json               Ordered scene playlist (no scene content yet — status: not-built)
  announcements.json          Ticker / overlay announcements
scenes/                   Empty — individual scene templates arrive in a later build step
admin/
  index.html, admin.css, admin.js   "Admin Panel Coming Soon" placeholder only
assets/
  images/ videos/ logos/ icons/ fonts/    Empty, ready for real media
```

## Design tokens

- **Colour**: deep purple (`--color-purple-700`) + warm orange (`--color-orange-500`) against a charcoal base (`--color-charcoal-900`), with a very light gray (`--color-gray-050`) reserved for any light-surface panels.
- **Type**: Fraunces (display) + Inter (body) + IBM Plex Mono (data/ticker labels).
- **Everything else** — spacing, radii, shadows, animation timing, z-index layers, container widths — is defined once in `css/variables.css` and consumed everywhere else via CSS custom properties.

## What's intentionally NOT built yet

- No scene content (Scene 001 onward)
- No scene-specific animation choreography
- No working admin functionality
- No real media assets

This is foundation only, per the build brief.
