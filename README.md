# Portfolio website

A Portfolio Website inspired by the PlayStationPortable

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
- **PSP buttons:** click the D-pad, ✕ (open), ○ (back), Home (back) or START (same as ✕; passes the Start screen).
- **Phones:** a one-time PSP-style welcome asks visitors to enable Rotation Lock and turn their phone sideways. The page is laid out landscape with a slimmer wheel on the left; held upright it turns a quarter turn so the PSP stands on its side, ready for the phone to be turned sideways (`PHONE` in `src/layout.js`). Taps and swipes on the PSP work; lighting controls are hidden.
- **Camera:** rotation is locked for now (`ROTATION_LOCKED` in `src/layout.js`). When unlocked, drag anywhere off the screen or use Shift + arrow keys.

## Editing the content

**See [`docs/content.md`](docs/content.md)** for where every piece of text, link and image lives, what to keep in `content.js`, and a checklist before committing. The short version:


- `src/xmb/content.js`: every category and item, including project write-ups, links and photo captions.
- `src/xmb/themes.js`: backdrop colour themes, shown in the XMB's Settings column (Crimson by default).
- `public/memories/`: photos referenced by the Memories items (until a file exists the screen shows where to add it). Use WebP at most 960 px wide, the width of the screen texture.
- `public/resume.pdf`: the résumé linked from Contact and the quick links; it downloads rather than opening (`public/_headers` sets it as an attachment on Cloudflare Pages).

## Files

- `src/App.jsx`: page shell, controls and XMB state.
- `src/MemoriesScene.jsx`: Three.js scene; textures the `screen_low` mesh to show the XMB canvas.
- `src/xmb/XmbRenderer.js`: draws the XMB (backdrop waves, status bar, menu, detail and photo views) into the screen texture.
- `src/xmb/state.js`: navigation reducer. `src/xmb/input.js`: keyboard, screen gestures and PSP buttons.
- `src/xmb/XmbA11y.jsx`: hidden copy of the content for screen readers and search engines.
- `src/xmb/icons.js`: Lucide icon outlines drawn on the canvas.
- `src/lighting.js`: original lighting presets.
- `assets-src/psp.glb`: the untouched PSP source. `npm run model:optimize` runs Blender cleanup and KTX2/meshopt compression into `public/models/psp-v3.glb`, the file the site loads (see "The model pipeline" in `docs/xmb.md`).

The music shop’s other pages, navigation, and audio player are excluded from this starting point.

## Model optimization

Install Blender (validated with 5.2.2) and [KTX-Software 4.4+](https://github.com/KhronosGroup/KTX-Software/releases), with `ktx` on PATH. Set `BLENDER_BIN` if Blender is not on PATH or in its usual macOS application location. These tools are required only to regenerate the asset; normal website builds use the committed GLB.

```sh
npm ci
npm run model:optimize
npm run model:check
npm test
npm run build
```

The cleanup preserves the source file and all interactive mesh names, reduces 58,200 triangles to 39,590, joins the static body, recalculates normals, enables backface culling, and bakes the screen UVs. The printed front shell and all buttons remain undecimated, with △, □, SELECT and START kept separate to preserve their labels and real click targets. The shipped model has 13 meshes, weighs 559 KB (453 KB gzip), and uses four KTX2 textures with about 2.6 MB estimated minimum GPU allocation. The previous JPEG model was 651 KB (410 KB gzip); KTX2 also needs a one-time Basis transcoder download, trading additional cold-load bytes for much lower GPU memory and fewer draw calls.

The shell starts one shared model fetch alongside the lazy scene import. This avoids duplicate HTML fetch preloads in WebKit. See [`docs/perf-followups.md`](docs/perf-followups.md) for browser validation and remaining physical-device checks.

## Cloudflare Workers deployment

`wrangler.jsonc` configures **psportfolio-milind** to serve the Vite build in `dist/` using Workers Static Assets. The portfolio needs no Worker entry script, database, API, or runtime secrets. All XMB navigation stays on `/`, so missing files return a real 404. The PSP model and KTX2/Basis files are committed or emitted by Vite; deployment does not run Blender or KTX-Software.

For a Git-connected Worker, use these Cloudflare build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Worker name | `psportfolio-milind` |
| Node.js | `24` (from `.node-version`) |

The installed Wrangler requires Node.js 22 or newer; `.node-version` selects Node.js 24 for Workers Builds and compatible local version managers. See [build image configuration](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/). The build environment must install development dependencies, including Vite and Wrangler (`npm ci` installs the locked versions). `npx wrangler` alone displays the CLI; the deployment command includes `deploy`. Workers Builds uses its configured Cloudflare authentication; do not put tokens in the repository. See [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

For local checks:

```sh
npm ci
npm test
npm run deploy:check
npm run preview:cloudflare
```

`deploy:check` builds and runs a Wrangler dry run without publishing. `preview:cloudflare` builds and starts Wrangler locally, including the `_headers` rules. After reviewing the preview, `npm run deploy` builds and publishes; first authenticate with `npx wrangler login` if deploying from your laptop.

`public/_headers` preserves the résumé attachment header and caches only Vite's hashed `/assets/*` files for a year. The model, photographs, sound files and HTML keep Cloudflare's default revalidation behavior, so replacing a file does not leave a year-old browser copy. See [static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).

Before publishing, supply the résumé at `public/resume.pdf` (currently missing), review the remaining portfolio content, and check the built site in the local Wrangler preview. The memo form opens a draft email for manual review; it needs no backend. Custom domains can be attached to the Worker in Cloudflare after deployment.
