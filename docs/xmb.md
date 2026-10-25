# The PSP OS (XMB clone)

The portfolio is a single page showing a 3D PSP. Its screen runs a small recreation of the PSP's XrossMediaBar (XMB) menu. Visitors browse **Projects, Games, Memories, About and Contact** on it, and can pick a colour theme under **Settings**, with the keyboard, by tapping the screen, or by clicking the PSP's own buttons.

This document explains where the OS lives, how a frame reaches the screen, and how to change it.

## Where things live

| Path | What it does |
| --- | --- |
| `src/xmb/content.js` | **All the content.** Categories, items, project write-ups, links, photo captions. Start here to edit the site. |
| `src/xmb/themes.js` | Backdrop themes (Crimson is the default), `themeColors()`, and saving the chosen theme to `localStorage`. |
| `src/xmb/state.js` | The navigation reducer (`xmbReducer`), its initial state (`initialXmb`), and `xmbLink`, which decides when an action opens a URL. |
| `src/xmb/XmbRenderer.js` | Draws the whole OS into an offscreen canvas that becomes the screen's texture. Owns animation, layout constants and hit boxes. |
| `src/xmb/input.js` | Keyboard mapping (`keyAction`) and pointer handling on the 3D model (`attachScreenInput`): taps, swipes, wheel, PSP buttons. |
| `src/xmb/icons.js` | Lucide icon outlines (ISC licence) stroked onto the canvas with `drawIcon`. |
| `src/xmb/buttonGlow.js` | Static halos around the PSP buttons that do something, brighter on hover. |
| `src/xmb/XmbA11y.jsx` | Hidden semantic HTML copy of the content, plus a live region announcing the focused item. |
| `src/MemoriesScene.jsx` | The three.js scene. Loads `public/models/psp.glb`, puts the XMB texture on the screen mesh, runs the render loop, and owns the camera. |
| `src/PageWheel.jsx` | The Persona 5–style page wheel beside the PSP. It mirrors the XMB's current category and can jump to one. |
| `src/layout.js` | `stageInsets()`: how much of the page the wheel reserves. Both the wheel and the camera framing read it. |
| `src/App.jsx` | Page shell. Holds the XMB state with `useReducer`, opens links, and renders the wheel. |
| `public/memories/` | Photos for the Memories category. |
| `public/resume.pdf` | Résumé linked from Contact. |

## How it fits together

```
 keyboard ─┐                       ┌─────────── App.jsx ───────────┐
 screen  ──┼─► input.js ─► action ─►  xmbLink() → window.open       │
 buttons ──┘   (MemoriesScene)     │  xmbReducer(state, action)     │
                                   └──────────────┬────────────────┘
                                                  │ xmbState (prop)
                         ┌────────────────────────┴───────────┐
                         ▼                                    ▼
          MemoriesScene → XmbRenderer.setState()        XmbA11y (hidden DOM)
                         │
          rAF loop: XmbRenderer.tick() ─► canvas ─► CanvasTexture ─► screen_low mesh
```

1. **Input** is turned into an action such as `{type:'DOWN'}` or `{type:'FOCUS', cat:1, item:2}`.
2. **`App.jsx`** runs the action through `xmbLink` first. If the action should open a link, it opens it right away, inside the click or key event, so the browser allows the new tab. `mailto:` links go through `location.href` instead. Then it dispatches the action to `xmbReducer`.
3. **The new state** goes back to `MemoriesScene` as the `xmbState` prop and into the renderer through `api.current.xmb(state)`. It also goes to `XmbA11y`.
4. **The render loop** calls `XmbRenderer.tick()`. That eases the displayed positions toward the new state, redraws the canvas, and flags the texture for upload.

## State model (`state.js`)

```js
{cat, item: [focused index per category], view: 'menu' | 'detail' | 'photo', scroll, link, theme}
```

- `item` remembers the focused item in **every** category, so going left and right returns you to where you were, like the real XMB.
- `view: 'detail'` shows an item's `detail` write-up. `scroll` is in steps of two lines. `link` is the selected link button.
- `view: 'photo'` shows a Memories item full screen. LEFT/RIGHT move through that category's items, wrapping round.

Actions:

| Action | Menu | Detail | Photo |
| --- | --- | --- | --- |
| `LEFT` / `RIGHT` | change category | select link button | previous / next photo |
| `UP` / `DOWN` | change item | scroll text | previous / next photo |
| `CONFIRM` | open detail or photo, apply a theme item's `theme`, or open `link` | open selected link (`link` index optional) | close |
| `BACK` | — | close | close |
| `FOCUS {cat, item?}` | jump to a category / item (taps) | — | — |
| `GOTO {cat}` | jump to a category (page wheel) | close, then jump | close, then jump |

`DOWN` in the detail view carries `maxScroll`, because only the renderer knows how tall the wrapped text is. `MemoriesScene` adds it to every action automatically (`act()`).

The reducer is pure and has no DOM access. Side effects such as opening links live in `App.jsx`.

## Rendering (`XmbRenderer.js`)

### Canvas and coordinates

- Everything is laid out in **480 × 270 logical units** (PSP resolution) and drawn at 2× into a 960 × 540 canvas (`SCALE`).
- Canvas `shadowBlur` and shadow offsets ignore the canvas transform, so they are multiplied by `SCALE` by hand.
- Layout constants sit at the top of the file:
  - `CAT_X`, `CAT_Y`, `CAT_W`: where the category bar sits and how far apart categories are
  - `ROW_H`, `ITEM_Y`, `ABOVE_Y`: item rows below and above the bar
  - `BODY_TOP`, `BODY_BOTTOM`, `LINE_H`: detail text area

### Layers, drawn in order each frame

1. **Background**: a vertical gradient in the current theme's colours (cross-faded when the theme changes), a soft top-left glow, and four sine "ribbons" (`waves`) blended with `'lighter'`.
2. **Status bar**: date and time in a bordered box, plus a battery glyph.
3. **Menu**:
   - Categories scale between 0.8 and 1.0 and fade by distance from focus. Only the focused one shows its label.
   - Each category's items are drawn in a column under it. The column fades out as you move away from that category.
   - Items above the focused one tuck in above the category bar, crossing it with a fade, like the real XMB.
   - The focused label pulses with a glow.
4. **Detail panel**: icon, title, subtitle, wrapped and clipped body text, a scrollbar, link "pills", and `✕ Open / ○ Back` hints.
5. **Photo viewer**: the image letterboxed to fit, caption, counter and arrows. If the image is missing, it shows where to add it.

### Animation

- `tick(now)` eases every displayed value toward its target with exponential smoothing (`1 - exp(-dt/0.07)`, about 250 ms to settle). Values tracked: category position, each category's item position, detail and photo opacity, and scroll.
- **Boot**: `boot(at)` is called 250 ms after the model loads. Before that the screen is black. The background then fades in over 0.8 s and the menu follows.
- **Reduced motion**: with `prefers-reduced-motion`, easing is instant, the waves freeze, and the canvas only redraws when the state or the clock's minute changes.

### Hit boxes and hover glow

Every draw rebuilds `this.hits`: rectangles in logical units, each carrying the action a tap there should fire. They are only recorded for the view that is currently interactive. `hitTest(x, y)` returns the topmost match. The hover cursor in `input.js` uses the same boxes.

`setHover(point)` stores the mouse position in logical units; `input.js` sets it from its hover raycast. While drawing, a category, item or link button whose box contains that point gets a soft radial `glow()` behind its icon. It is only redrawn when the point changes, so the cost is one gradient fill.

## Themes (`themes.js`)

- **The list**: each theme in `themes` has an `id`, a `label` and gradient `colors: [top, bottom]`. `colors: null` means "follow the month" (the original PSP's monthly colours); that's the `monthly` theme.
- **Default**: `DEFAULT_THEME` is `crimson`, red to match the page wheel.
- **Settings column**: `content.js` builds the **Settings** category from `themes`, one item per theme, each carrying `theme: id`.
  - Confirming one sets `state.theme`.
  - `itemSub()` in `state.js` shows "✓ In use" under the active theme. Both the renderer and the screen-reader announcement use it.
- **Saving**: `initialXmb()` reads the saved theme with `savedTheme()`, and `App.jsx` writes it back with `saveTheme()` whenever it changes. Both wrap `localStorage` in try/catch, so private windows simply fall back to Crimson.
- **Cross-fade**: `tick()` eases the displayed backdrop colours (`shown.top`, `shown.bottom`) channel by channel toward `themeColors(state.theme)`, so switching themes fades rather than snaps.
- **Adding a theme**: add an entry to `themes`. It appears in Settings automatically.

## Putting it on the PSP (`MemoriesScene.jsx`)

- **The screen mesh**: in `psp.glb`, the screen is the node **`screen_low`**, a flat 1.687 × 0.948 grid. It originally shares the body's texture atlas, and its UVs point at a static placeholder image.
- **Remapping on load**: when the model loads, the scene:
  - rewrites the screen's UVs with a planar projection, `u = (x − minX) / width` and `v = (y − minY) / height`, so the whole canvas fills the glass
  - gives the screen its own `MeshStandardMaterial`: black base colour, the XMB canvas as `emissiveMap`, `roughness .18`, and `toneMapped: false`
- **Why emissive**: the menu shows its exact colours regardless of the lighting preset or ACES tone mapping, while the glossy surface still picks up environment reflections that look like glass.
- **The texture**: `CanvasTexture` with `SRGBColorSpace`, maximum anisotropy so it stays sharp at an angle, and the default `flipY`, which matches the remapped UVs.
- **Render loop**: one `requestAnimationFrame` loop does two things.
  - The XMB ticks at up to about 30 fps (`now - lastTick >= 32`).
  - The scene re-renders only when the XMB redrew or the camera changed (`render()` just sets `needsRender`).
  - rAF pauses on its own in background tabs.

### Camera framing and rotation

The PSP faces the camera head-on: the model has no roll, and the camera sits straight in front at `(0, 0, distance)`.

At the top of `MemoriesScene.jsx`:

```js
export const ROTATION_LOCKED=true;
const FILL_WIDTH=.9, FILL_HEIGHT=.72, PSP_HALF_WIDTH=1.5, PSP_HALF_HEIGHT=.7;
```

- **Free area**: `stageInsets()` in `src/layout.js` reserves a strip of the page for the wheel. The PSP is framed in the rest.
  - **Wide screens (760 px and up)**: the strip is on the left, 36% of the width up to 520 px.
  - **Narrow screens**: the strip is everything above a band just tall enough for the PSP.
- **View offset**: the WebGL canvas still covers the whole page. `camera.setViewOffset(w, h, -left/2, -top/2, w, h)` slides the picture so the PSP is centred in the free area. Raycasting takes the offset into account automatically, because it is part of the projection matrix.
- **`resetView()`**: places the camera so the PSP spans `FILL_WIDTH` of the free area's width, capped so it never takes more than `FILL_HEIGHT` of its height. Raise these values to make the PSP bigger.
- **`ROTATION_LOCKED`**: free rotation is currently **off**. This one flag:
  - disables OrbitControls rotation (`enableRotate`)
  - ignores Shift+arrow rotation
  - hides the reset-view button and moves the lighting button down to its place
  - uses a default cursor instead of the grab hand
  - drops the rotation hint from the canvas `aria-label`

  Set it to `false` to bring rotation back.

## Input (`input.js`)

**Keyboard** (`keyAction`). The listener is on `window`, but it only acts when focus is on the page body or the 3D canvas, so the lighting slider keeps its arrow keys.

| Keys | Action |
| --- | --- |
| Arrows, WASD | LEFT / RIGHT / UP / DOWN |
| Enter, Space, X | CONFIRM |
| Esc, Backspace, O | BACK |

Pressing a mapped key also animates the matching PSP button.

**Pointer** (`attachScreenInput`): each event casts a ray into the whole model, so the body blocks hits from behind or at steep angles.

- **The screen**:
  - A hit converts `uv` to logical screen coordinates.
  - A tap (under 6 px of movement) runs `hitTest`.
  - A swipe (over 24 px) moves the menu. Horizontal swipes change category; vertical swipes change item.
  - The wheel steps items (40 px of delta per step) and only blocks page scrolling while the pointer is over the screen.
- **Physical buttons** (mesh names in `psp.glb`):

  | Mesh | Button | Action |
  | --- | --- | --- |
  | `button1_low` / `button2_low` / `button3_low` / `button4_low` | D-pad up / right / down / left | UP / RIGHT / DOWN / LEFT |
  | `button7_low` | ✕ | CONFIRM |
  | `button6_low` | ○ | BACK |
  | `button9_low` | Home | BACK |

  `button5_low` (△) and `button8_low` (□) are unmapped. A press nudges the mesh along local z for 120 ms. The map is exported as `buttonActions`.
- **Button glow** (`buttonGlow.js`):
  - Every button in `buttonActions` gets a halo: a quad sitting just above the button.
  - All the halos share one ring texture, transparent in the middle so the button stays visible, drawn with additive blending, `depthWrite: false` and no raycasting.
  - The glow is static at 0.4 opacity and rises to 0.95 on hover. `input.js` reports the hovered button through `onHoverButton`, and the scene re-renders only then.
  - The cost is seven extra quads and no post-processing.
- **Orbit conflict**: the pointerdown listener runs in the **capture** phase. When it hits the screen or a button, it sets `controls.enabled = false` for that gesture, before OrbitControls sees the event. This only matters when rotation is unlocked.

## Saved effects (`src/effects/`)

The page background is a plain near-black gradient (`.memories-stage` in `styles.css`). There is no animation on it.

`src/effects/pulseBackground.js` is a **saved, currently unused** effect kept for a later feature. It draws soft shockwaves on a 2D canvas: a glow, two expanding rings and drifting sparks, about 1.4 s each, in a given colour. It only animates while a pulse is alive and does nothing with reduced motion.

- **What's still wired**: `act(action, origin)` in `MemoriesScene.jsx` already receives the world point each action came from. `input.js` passes the button or screen point, and `input.origin(type)` gives one for keys.
- **Re-enabling it** takes three steps, listed in the comment at the top of the file: add the canvas, create and resize the effect, and call `emit()` from `act`.

## Page wheel (`PageWheel.jsx`)

A Persona 5–inspired half wheel pinned to the left edge (or the top, on narrow screens).

- **Labels**: big bold Anton type (loaded from Google Fonts in `index.html`, falling back to Impact), one per category in `content.js`, laid out along rays 34° apart.
- **Spin**:
  - When the XMB changes category, the label wheel and the ticked disc rotate by `--active × −34°` with an overshooting cubic-bezier, so the new page lands on the red marker at 3 o'clock.
  - The active label switches from outline to solid white with a hard black shadow, and plays `wheel-pop`.
  - The marker is remounted with `key` so its `wheel-marker` animation replays.
  - The black tag under the marker shows the view (Browsing / Reading / Viewing) and the focused item, and slides in again when either changes.
- **Clicking a label** dispatches `GOTO`, which closes any open detail or photo and moves the XMB to that page.
- **Sizes**: the wheel fills the strip from `stageInsets()`. Its radius is `min(height × 0.4, width × 0.8)`, and everything else scales from the CSS variables `--r` and `--font`.
- **Animation cost**: only transforms and opacity are animated. The global reduced-motion rule turns the animations off.
- **Accessibility**: the wheel is a `<nav aria-label="Pages">` of real buttons, with `aria-current="page"` on the active one. Labels more than two steps away are hidden, so they can't be clicked until the wheel turns closer.

## Accessibility and SEO (`XmbA11y.jsx`)

- **Hidden copy**: a visually hidden (`.sr-only`) section renders every category as headings and lists, with every link as a real `<a>`. Screen readers and crawlers get the full content.
- **Live announcements**: an `aria-live="polite"` paragraph announces the focused item. In the detail view it announces the whole write-up; in the photo view, the caption.
- **The canvas**: it is focusable (`tabIndex=0`) and its `aria-label` describes the controls.

## Common changes

- **Edit text, links or photos**: change `src/xmb/content.js` only. Both the screen and the hidden copy read from it.
  - An item with `detail` opens a write-up.
  - An item with `photo` opens the viewer.
  - An item with only `link` opens the link straight away.
- **Add a category**: add an entry to `categories`. Its icon must be a key in `icons.js`. Nothing else needs to change: the state sizes `item[]` from `categories`, and the wheel adds a label. With more than about seven categories, lower the 34° step in `styles.css` so the labels still fit.
- **Add an icon**: copy the icon's nodes from `node_modules/lucide-react/dist/esm/icons/<name>.js` into `nodes` in `icons.js`. Supported tags are `path`, `line`, `circle` and `rect`.
- **Add a new view** (for example a video player):
  1. Add a branch to `xmbReducer` for the new `view`.
  2. Add an opacity value to `shown` and ease it in `tick`.
  3. Write a draw method and call it from `draw`.
  4. Push its hit boxes when it is interactive.
- **Change the look**: tweak the constants at the top of `XmbRenderer.js` (layout, `months`, `waves`, `FONT`).

## Gotchas

- **Icon paths**: Lucide paths that start with a relative `m` are prefixed with `M0 0` when joined into one `Path2D`. Without that, they would be drawn relative to the previous sub-path.
- **Links need a live user gesture**: `window.open` must run synchronously inside the key or pointer handler. That's why `xmbLink` runs in `App.jsx` before dispatching, rather than in an effect.
- **`xmbRef` in `App.jsx`**: it is updated with the reducer's result immediately, so several actions in one event (or before React re-renders) see the latest state.
- **The texture is disposed with the model**: `disposeModel` already disposes the screen material's `emissiveMap`, and `xmb.dispose()` runs on unmount. Disposing twice is harmless.

## Checking changes

There are no automated tests. `npm run build` must pass. Then run `npm run dev` and check:

- The screen boots: background first, then the menu.
- Arrows move smoothly, Enter opens a write-up, Esc returns.
- Tapping a row focuses it, and tapping the focused row opens it.
- The PSP's D-pad, ✕ and ○ work.
- Links open in a new tab.
- With rotation locked, dragging and Shift+arrows do nothing.
- The wheel spins to each page as the XMB changes, and clicking a wheel label jumps there.
- The screen is red by default. Picking a theme under Settings fades the backdrop to it, and the choice survives a reload.
- Hovering a PSP button or an on-screen item makes it glow.
- On a phone-sized window, the wheel sits above the PSP and the lighting button moves to the top-right.
- With reduced motion turned on in your OS settings, everything still works without animation.
