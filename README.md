# Portfolio website

A standalone React + Vite starting point copied from the Memories page in `../music_website`.

## Development

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
npm run preview
```

The main page renders the interactive PSP scene, dot background, three lighting presets, loading screen, and retry control. The PSP's screen runs a recreation of the XMB menu with Projects, Memories, About, Contact and Settings (colour themes).

See [`docs/xmb.md`](docs/xmb.md) for how the PSP OS works and where everything lives.

## Controls

- **Menu:** arrow keys or WASD move, Enter / Space / X opens, Esc / Backspace / O goes back.
- **On the screen:** tap an item to focus it, tap again to open it; swipe to move; scroll the wheel over the screen to move through items.
- **PSP buttons:** click the D-pad, ✕ (open), ○ (back) or Home (back).
- **Camera:** rotation is locked for now (`ROTATION_LOCKED` in `src/MemoriesScene.jsx`). When unlocked, drag anywhere off the screen or use Shift + arrow keys.

## Editing the content

- `src/xmb/content.js`: every category and item, including project write-ups, links and photo captions.
- `src/xmb/themes.js`: backdrop colour themes, shown in the XMB's Settings column (Crimson by default).
- `public/memories/`: photos referenced by the Memories items (until a file exists the screen shows where to add it).
- `public/resume.pdf`: the résumé linked from Contact.

## Files

- `src/App.jsx`: page shell, controls and XMB state.
- `src/MemoriesScene.jsx`: Three.js scene; remaps the `screen_low` mesh to show the XMB canvas.
- `src/xmb/XmbRenderer.js`: draws the XMB (backdrop waves, status bar, menu, detail and photo views) into the screen texture.
- `src/xmb/state.js`: navigation reducer. `src/xmb/input.js`: keyboard, screen gestures and PSP buttons.
- `src/xmb/XmbA11y.jsx`: hidden copy of the content for screen readers and search engines.
- `src/xmb/icons.js`: Lucide icon outlines drawn on the canvas.
- `src/lighting.js`: original lighting presets.
- `public/models/psp.glb`: self-contained copy of the source project’s exported PSP model; no sibling directory is needed at runtime.

The music shop’s other pages, navigation, and audio player are excluded from this starting point.
