# The PSP OS (XMB clone)

The portfolio is a single page showing a 3D PSP. Its screen runs a small recreation of the PSP's XrossMediaBar (XMB) menu. Visitors browse **Projects, Games, Memories, About and Contact** on it, and can pick a theme under **Settings**, with the keyboard, by tapping the screen, or by clicking the PSP's own buttons.

This document explains where the OS lives, how a frame reaches the screen, and how to change it.

## Where things live

| Path | What it does |
| --- | --- |
| `docs/content.md` | **Where every piece of content lives** and how to edit it safely. |
| `public/education/` | Pictures used on detail pages (the Education seal). |
| `src/xmb/content.js` | **All the content.** Categories, items, project write-ups, links, photo captions. Start here to edit the site. |
| `src/features.js` | Hard-coded feature flags. `bo2Theme` (on) offers the basic Black Ops II theme; `bo2ThemeAdvanced` (off) adds its HUD and Main Menu. |
| `src/xmb/themes.js` | Themes (Crimson is the default), the page `experiences` they belong to, `themeColors()`, `themeExperience()`, and saving the chosen theme to `localStorage`. |
| `src/xmb/state.js` | The navigation reducer (`xmbReducer`), its initial state (`initialXmb`), `xmbLink`, which decides when an action opens a URL, and `xmbOpensMemo`, which decides when one opens the Leave a memo dialog. |
| `src/xmb/XmbRenderer.js` | Draws the whole OS into an offscreen canvas that becomes the screen's texture. Owns animation, layout constants and hit boxes. |
| `src/xmb/input.js` | Keyboard mapping (`keyAction`) and pointer handling on the 3D model (`attachScreenInput`): taps, swipes, PSP buttons. |
| `src/xmb/icons.js` | Lucide icon outlines (ISC licence) stroked onto the canvas with `drawIcon`. |
| `src/xmb/buttonGlow.js` | Thin glows traced from each live PSP button's own outline, brighter on hover. |
| `src/Help.jsx` | The ? in the bottom-right corner and its help card, a system dialog like Leave a memo. |
| `src/trophyArt.js`, `src/TrophyIcon.jsx` | PlayStation-style trophy art: `drawTrophy` for Settings → Trophies on the canvas, `TrophyIcon` for the banner and Help. |
| `src/QuickLinks.jsx` | GitHub, LinkedIn and résumé icons in the top-right corner, styled per experience. |
| `src/LoadingScreen.jsx` | The boot screen: the XMB ribbon across the middle and "Loading" beneath. |
| `src/xmb/XmbA11y.jsx` | Hidden semantic HTML copy of the content, plus a live region announcing the focused item. |
| `src/MemoriesScene.jsx` | The three.js scene. Loads `public/models/psp-v3.glb` (lazy-loaded chunk), puts the XMB texture on the screen mesh, runs the render loop, and owns the camera. |
| `src/PageWheel.jsx` | The Persona 5–style page wheel beside the PSP, shown by experiences with `wheel`. It mirrors the XMB's current category and can jump to one. |
| `src/layout.js` | `stageInsets()`: how much of the page the wheel reserves (nothing without a wheel). Both the wheel and the camera framing read it. |
| `src/experiences/transitions.js` | Timelines for moving the PSP between experiences (`pose()`), and when the skin swaps and the wheel appears. |
| `src/experiences/persona5/` | The Persona 5 page: `Persona5Backdrop` behind the PSP and the `CallingCard` cut-in. |
| `src/experiences/bo2/` | The Black Ops II page: `Bo2Backdrop` (a dark tactical grid with the game's HUD round the PSP: kill feed and scoreboard bottom left, its round following the current page, and scorestreaks and ammo on the right) and the `MainMenu` beside the PSP. |
| `src/experiences/gta/` | The GTA page: `GtaBackdrop` (Vice City art from `public/experiences/gta/`), the `CashBar` (top right, see below) and the `GtaCutscene` cut-in. GTA has no wheel. |
| `src/useWheelBox.js` | The strip `stageInsets()` leaves for a wheel, shared by both wheels. |
| `src/App.jsx` | Page shell. Holds the XMB state with `useReducer`, opens links, and renders the active experience's wheel and extras. |
| `public/memories/` | Photos for the Memories category. |
| `public/resume.pdf` | Résumé linked from About, Experience, Contact and the quick links. It always downloads as `RESUME_FILE`: `App.jsx` saves it instead of opening a tab, and `public/_headers` makes Cloudflare Pages send it as an attachment. |

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
{cat, item: [focused index per category], view: 'menu' | 'detail' | 'photo' | 'folder' | 'game', sub, scroll, link, theme, started, unlocked}
```

- **Start screen**: every visit starts with `started: false`. The screen shows only its backdrop (in the saved theme's colours), the status bar and a pulsing **START**, with "Press ✕, ↵ or tap the screen" beneath it and "Tap Start to Begin" under the PSP. Only `CONFIRM` does anything (✕, Enter, or a tap anywhere on the screen, which is one big hit box); it sets `started` and plays `ok`. START fades out first, then Settings fades in, using the same staged reveal as folders.
- **Theme first**: after Start, the visit is `unlocked: false` on **Settings**, on Crimson (`DEFAULT_THEME`), focused inside the Classics folder. While locked, only Settings is drawn and nothing can leave it. Applying any theme sets `unlocked`, the other categories fade in, and `App.jsx` moves to **About** (`START`) once any transition has played. Until then the page shows "Select a theme first" under the PSP, in Michroma (self-hosted, a wide geometric face like the PlayStation wordmark), and the layout is always Classic.
- `view: 'folder'` lists a folder item's entries (`item.folder`), with `sub` the focused one. The column slides left, keeping just the folder icon, and the entries open to its right like a PSP folder. Parent labels fade first; the sublist begins appearing about 85 ms into opening. The stages follow animation progress, so reversing midway stays clean. Item subtitles and adjacent category columns also fade out before their replacements appear; reduced motion switches immediately. `LEFT`/`BACK` or tapping the folder icon closes it.

- `item` remembers the focused item in **every** category, so going left and right returns you to where you were, like the real XMB.
- `view: 'detail'` shows an item's `detail` write-up. `scroll` is in steps of two lines. `link` is the selected link button.
- `view: 'photo'` shows a Memories item full screen. LEFT/RIGHT move through that category's items, wrapping round.

Actions:

| Action | Menu | Detail | Photo |
| --- | --- | --- | --- |
| `LEFT` / `RIGHT` | change category | select link button | previous / next photo |
| `UP` / `DOWN` | change item | scroll text | previous / next photo |
| `NEXT` / `PREV` | next / previous item, carrying on into the next category's first item or the previous one's last (page scroll) | scroll text | next / previous photo |
| `CONFIRM` | open detail, photo or folder, apply a theme item's `theme`, or open `link` | open selected link (`link` index optional) | close |
| `BACK` | — | close | close |
| `FOCUS {cat, item?}` | jump to a category / item (taps) | — | — |
| `GOTO {cat}` | jump to a category (page wheel) | close, then jump | close, then jump |

In a folder, `UP`/`DOWN`/`NEXT`/`PREV` move through its entries, `FOCUS {sub}` focuses one, `CONFIRM` applies the focused theme (the folder stays open), and `LEFT`/`BACK` close it.

`DOWN` and `NEXT` in the detail view carry `maxScroll`, because only the renderer knows how tall the wrapped text is. `MemoriesScene` adds it to every action automatically (`act()`).

The reducer is pure and has no DOM access. Side effects such as opening links live in `App.jsx`.

## Rendering (`XmbRenderer.js`)

### Canvas and coordinates

- Everything is laid out in **480 × 270 logical units** (PSP resolution) and drawn at 2× into a 960 × 540 canvas (`SCALE`).
- Canvas `shadowBlur` and shadow offsets ignore the canvas transform, so they are multiplied by `SCALE` by hand.
- Layout constants sit at the top of the file:
  - `CAT_X`, `CAT_Y`, `CAT_W`: where the category bar sits and how far apart categories are
  - `ROW_H`, `ITEM_Y`, `ABOVE_Y`: item rows below and above the bar
  - `BODY_TOP`, `BODY_BOTTOM`, `LINE_H`: detail text area
  - `FLOAT_GAP`, `GRID_GAP`: space beside a floated image and between grid cards

### Detail pages (`layoutPage`, `drawPage`)

- **Layout:** `layoutPage()` turns a page's `blocks` (or plain `body`) into positioned ops once per item and skin (cached in `this.wrapped`). Ops are text runs, bullet and timeline dots, rails, heading rules, `image` boxes and `card` backgrounds. Text wraps line by line, so a floated image narrows only the lines beside it (`beside()`, `indent()`, `room()`), and the next grid or image clears the float. Every image box has a fixed size from the content, so pictures arriving later never move anything.
- **Drawing:** `drawPage()` paints the ops each redraw, clipped to the body and shifted by the scroll. It skips ops outside the visible band, using an op's height for images and cards.
- **Images:** `pageImage()` draws them through `photo()` (the same loader and cache as Memories), so a picture downloads when its page first opens and triggers a redraw when it arrives. `contain` fits the whole picture (logos, pushed to the float's side), and `cover` crops to fill (banners, cards). A missing file leaves a faint placeholder.
- **Content format** is documented for editors in `docs/content.md` (Page blocks). `layoutPage` is exported for the renderer tests.

### Layers, drawn in order each frame

Each frame composites cached layers and animated highlights into the texture canvas (`out`), in this order:

- **Backdrop** (`this.backdrop`, 480×270, 1×): item 1 below, redrawn every frame and scaled up. The waves are soft, so a quarter of the pixels looks the same.
- **Menu** (`this.ctx`, 960×540): status, categories and items, excluding the pulsing focus label. Cached until dirty or easing.
- **Menu pulse** (`pulse(t)`): the glowing focused label, composited before any page overlay so it fades beneath the incoming page.
- **Page overlay** (`this.overlay`, 960×540): the detail/photo background and text, cached with the menu. Drawing helpers temporarily target this context. This costs one additional 2D canvas; the extra composite is skipped while only the menu is visible.
- **Link pulse** (`pulse(t, true)`): the selected detail link pill, drawn above its page.

`foreground()` refreshes both caches and their hit boxes. The exact final frame is also cached when easing snaps to its target, so outgoing text and hit areas cannot remain in the last intermediate state. Idle frames continue to reuse the caches.


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

- `tick(now)` eases every displayed value toward its target with exponential smoothing (`1 - exp(-dt/0.07)`, about 250 ms to settle). Values tracked: category position, each category's item position, and scroll. Opening/closing detail and photo views switches in one rendered frame, without cross-fading the outgoing view underneath the new one.
- **Boot**: `boot(at)` is called 250 ms after the model loads. Before that the screen is black. The background then fades in over 0.8 s and the menu follows.
- **Frame budget**: `tick()` gates itself. A change (`dirty`) draws on the next display refresh, and it redraws at 60 fps while anything is easing (`MOVING_FRAME`). It drops to every 32 ms (~30 fps) for 4 s after any `setState`/`setHover` (`poke()`) once the menu is still, and to every 80 ms (~12 fps) for the idle waves (`ACTIVE_FRAME`, `IDLE_FRAME`, `ACTIVE_FOR`). `dueAt` keeps the average on screens whose refresh isn't a multiple of 60 (a 144 Hz screen alternates two and three refreshes). A warm frame costs about 2 ms of canvas work plus under 1 ms of WebGL, and each 60 fps burst lasts only as long as the easing (about 0.3 s per move).
- **Input latency**: `MemoriesScene`'s `act()` hands the state that `App.jsx`'s `xmbAction` returns straight to the renderer, so keys and taps don't wait for React's commit and effects. The effect then passes the same state again, which costs one redundant redraw.
- **Reduced motion**: with `prefers-reduced-motion`, easing is instant, the waves freeze, and the canvas only redraws when the state or the clock's minute changes.

### Hit boxes and hover glow

Every draw rebuilds `this.hits`: rectangles in logical units, each carrying the action a tap there should fire. They are only recorded for the view that is currently interactive. `hitTest(x, y)` returns the topmost match. The hover cursor in `input.js` uses the same boxes.

`setHover(point)` stores the mouse position in logical units; `input.js` sets it from its hover raycast. While drawing, a category, item or link button whose box contains that point gets a soft radial `glow()` behind its icon. It is only redrawn when the point changes, so the cost is one gradient fill.

## Themes (`themes.js`)

- **The list**: each theme in `themes` has an `id`, a `label` and gradient `colors: [top, bottom]`. `colors: null` means "follow the month" (the original PSP's monthly colours); that's the `monthly` theme.
- **Default**: `DEFAULT_THEME` is `crimson`. The page wheel uses the active theme’s top gradient colour for its accents.
- **Settings column**: `content.js` builds the **Settings** category from `themes`. The Classic themes go into a **Classics** folder item (`folder: [...]`); every other experience gets its own item. Theme items carry `theme: id`.
  - Confirming one sets `state.theme` (and `unlocked`).
  - `itemSub()` in `state.js` shows "✓ In use" under the active theme, and "✓ Cobalt in use" under the folder holding it. Both the renderer and the screen-reader announcement use it.
- **Not saved**: themes don't carry over between visits. `initialXmb()` always starts on `DEFAULT_THEME`, so the locked theme picker never shows a half-applied theme from last time.
- **Cross-fade**: `tick()` eases the displayed backdrop colours (`shown.top`, `shown.bottom`) channel by channel toward `themeColors(state.theme)`, so switching themes fades rather than snaps.
- **Adding a theme**: add an entry to `themes` with `experience: 'classic'`. It appears in the Classics folder automatically.

### Experiences

Each theme names an `experience`, a whole page treatment in `experiences`:

```js
classic:{id:'classic',wheel:false,fill:{w:.78,h:.8},screen:'xmb'},
persona5:{id:'persona5',wheel:'persona5',fill:{w:.95,h:.8},screen:'persona5'},
gta:{id:'gta',wheel:false,fill:{w:.8,h:.78},screen:'gta'},
bo2:{id:'bo2',wheel:'bo2',fill:{w:.8,h:.74},screen:'bo2'},
```

- **`wheel`**: which page wheel to show (`App.jsx` maps `persona5` to `PageWheel` and `bo2` to `MainMenu`; each gets `onSelect(cat)` and `onAction(action)`), or `false`. `stageInsets()` reserves its strip only when there is one.
- **`fill`**: how much of the free area the PSP spans (width, height). Classic keeps it to about 80% of the page.
- **`screen`**: the XMB skin (`XmbRenderer.setSkin`). `bo2` draws Nuketown (`public/experiences/bo2/nuketown.jpg`, scaled to cover once and cached) shaded darker on the menu side, with category names in capitals and the focused item in orange. `gta` draws a sunset with the Vice City skyline and bay, and outlines labels in black like San Andreas' subtitles. `persona5` replaces the waves with a turning starburst, halftone dots and slashes, sets labels in capitals in Anton, and puts the focused item on a black jagged plate. Layout and hit boxes are the same in every skin.
- **Switching**: `App.jsx` derives the experience from `state.theme`, puts `experience-<id>` on `<main>`, and passes it to `MemoriesScene`. When only the colours change (Classic to Classic), nothing moves.
  - Moving to a game experience (from Classic or another game) plays `enter`: the PSP shakes, does a full flip on Y with a dip and a hop, and the camera framing slides it into the free area (GTA has no wheel, so it stays centred). Going back to Classic plays `exit`: a reverse flip back to the big frame.
  - The skin swaps at `SKIN_AT`, while the screen faces away. The wheel swings in after `WHEEL_AT`.
  - Each game also plays its cut-in from `cutIns` in `App.jsx`: Persona 5's `CallingCard`, or GTA's `GtaCutscene` (letterbox bars and Big Smoke's line as an outlined subtitle, about 3.6 s). Its backdrop fades in behind the canvas (backdrops are passed to `MemoriesScene` as children). `GtaBackdrop` only requests its image once the experience has been used.
  - **Main Menu** (Black Ops II) replaces a wheel: the pages stacked under "Main Menu" in the menu's teal, the current one orange between thin brackets with the Black Ops mode it stands in for beneath (Campaign, Zombies, Theater, Combat Record, Party, Options). Behind them a wireframe globe turns inside a sniper scope's mil-dot reticle. Games is Zombies, so the menu lights Ray Gun green there. Clicking a page jumps the PSP there. In a wide, short strip the pages sit in a row. Black Ops has no cut-in.
  - **The cash bar** (GTA) is GTA V's `cash $1234` readout in the top-right corner, in Pricedown green. Pricedown's licence rules out web fonts, so `scripts/render-cash-sprite.py` renders its glyphs once into `public/experiences/gta/cash.png` and writes their positions to `cashGlyphs.js`; `CashBar` builds the text from that sprite. Clearing a Button Rush round while the GTA theme is on pays `PAYOUTS[round]` from `game.js` ($250, $500, $1000, $2500): `App.jsx` adds `roundPay(previous, next)` to the cash, which is kept in `localStorage` (`gta-cash`). Each payout slides in underneath as `+$500` while the total counts up.
  - A saved experience appears on load without a transition, and reduced motion snaps straight to the end.
- **Adding a game experience**: add it to `experiences` and a theme that uses it, a skin branch in `XmbRenderer` if the screen changes, and any page pieces under `src/experiences/<id>/`, rendered from `App.jsx` and styled under `.experience-<id>`.

## Putting it on the PSP (`MemoriesScene.jsx`)

- **The screen mesh**: the node **`screen_low`** is a flat 1.687 × 0.948 grid. Blender bakes its UVs to fill 0–1, with U following glTF +X and V following +Y. No runtime UV remap is needed. The cleanup accounts for Blender's Z-up import and the glTF exporter's V flip.
- **The material**: the scene replaces the screen's placeholder with a `MeshStandardMaterial`: black base colour, XMB canvas as `emissiveMap`, `roughness .18`, and `toneMapped: false`.
- **Why emissive**: the menu shows its exact colours regardless of the lighting preset or ACES tone mapping, while the glossy surface still picks up environment reflections that look like glass.
- **The texture**: `CanvasTexture` with `SRGBColorSpace`, maximum anisotropy so it stays sharp at an angle, and the default `flipY`, which matches the baked UVs. Mipmaps are off (`LinearFilter`): the texture is re-uploaded every frame and shown at about its own size.
- **Render loop**: one `requestAnimationFrame` loop does two things.
  - It calls `xmb.tick(now)` every frame; the renderer decides whether a redraw is due (see Frame budget).
  - The scene re-renders only when the XMB redrew or the camera changed (`render()` just sets `needsRender`).
  - rAF pauses on its own in background tabs.

### Camera framing and rotation

The PSP faces the camera head-on: the model has no roll, and the camera sits straight in front at `(0, 0, distance)`.

`ROTATION_LOCKED` lives in `src/layout.js` (so `App.jsx` can read it without loading the three.js chunk). The PSP's size is at the top of `MemoriesScene.jsx`, and how much of the page it fills comes from the experience's `fill`:

```js
export const ROTATION_LOCKED=true;
const PSP_HALF_WIDTH=1.5, PSP_HALF_HEIGHT=.7;
```

- **Free area**: `stageInsets()` in `src/layout.js` reserves a strip of the page for the wheel, when the experience has one. The PSP is framed in the rest.
  - **Wide screens (760 px and up)**: the strip is on the left, 28% of the width up to 400 px.
  - **Narrow screens**: the strip is everything above a band just tall enough for the PSP.
- **View offset**: the WebGL canvas still covers the whole page. `camera.setViewOffset(w, h, -left/2, -top/2, w, h)` slides the picture so the PSP is centred in the free area. Raycasting takes the offset into account automatically, because it is part of the projection matrix.
- **`resetView()`**: places the camera so the PSP spans `fill.w` of the free area's width, capped so it never takes more than `fill.h` of its height. During a transition it mixes the old and new experience's insets and fill by `frame.mix`, which is how the PSP shrinks aside.
- **The rig**: the model hangs off a `rig` group that transitions shake, flip and scale; at rest it is the identity.
- **`ROTATION_LOCKED`**: free rotation is currently **off**. This one flag:
  - disables OrbitControls rotation (`enableRotate`)
  - ignores Shift+arrow rotation
  - hides the reset-view button and moves the lighting button down to its place
  - uses a default cursor instead of the grab hand
  - drops the rotation hint from the canvas `aria-label`

  Set it to `false` to bring rotation back.

## Input (`input.js`)

**Keyboard** (`keyAction`). The listener is on `window`, but it only acts when focus is on the page body or the 3D canvas, so buttons and links on the page keep their own keys.

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
- **Physical buttons** (mesh names in the model):

  | Mesh | Button | Action |
  | --- | --- | --- |
  | `button1_low` / `button2_low` / `button3_low` / `button4_low` | D-pad up / right / down / left | UP / RIGHT / DOWN / LEFT |
  | `button7_low` | ✕ | CONFIRM |
  | `button6_low` | ○ | BACK |
  | `button9_low` | Home | BACK |
  | `start_low` | START | CONFIRM |

  The shipped model still merges △, □ and START into the body, so `addFaceButtons` adds invisible stand-ins: △ (`button5_low`) and □ (`button8_low`) are cut from ○ and placed in the face-button diamond, and `start_low` is Home's half pill mirrored across the PSP's centre line, centred on START's position in the source model. `scripts/prepare-model.py` now keeps △, □, SELECT (`button14_low`) and START (`button15_low`) as separate, undecimated meshes. Once the model is rebuilt (`npm run model:optimize`) the real meshes are used and the stand-ins are skipped. △ and □ are unmapped outside Button Rush; START passes the Start screen and starts or retries Button Rush, and is ignored mid-round. A press nudges the mesh along local z for 120 ms. The map is exported as `buttonActions`.
- **Button glow** (`buttonGlow.js`):
  - Every button in `buttonActions` gets a halo: a quad sitting just above the button.
  - All the halos share one ring texture, transparent in the middle so the button stays visible, drawn with additive blending, `depthWrite: false` and no raycasting.
  - The glow is static at 0.4 opacity and rises to 0.95 on hover. `input.js` reports the hovered button through `onHoverButton`, and the scene re-renders only then.
  - The cost is seven extra quads and no post-processing.
- **Off the PSP**: while rotation is locked, a vertical swipe that starts off the model sends `NEXT` (up) or `PREV` (down).
- **Page scroll**: `MemoriesScene` listens for `wheel` on the whole window (except pinch-zoom) and sends `NEXT` / `PREV`. 40 px of delta is one step, a 200 ms pause resets the count, and steps are at least 140 ms apart so trackpad momentum doesn't race through the menu.
- **Orbit conflict**: the pointerdown listener runs in the **capture** phase. When it hits the screen or a button, it sets `controls.enabled = false` for that gesture, before OrbitControls sees the event. This only matters when rotation is unlocked.

## Saved effects (`src/effects/`)

The page background is a plain near-black gradient (`.memories-stage` in `styles.css`). There is no animation on it.

`src/effects/pulseBackground.js` is a **saved, currently unused** effect kept for a later feature. It draws soft shockwaves on a 2D canvas: a glow, two expanding rings and drifting sparks, about 1.4 s each, in a given colour. It only animates while a pulse is alive and does nothing with reduced motion.

- **What's still wired**: `act(action, origin)` in `MemoriesScene.jsx` already receives the world point each action came from. `input.js` passes the button or screen point, and `input.origin(type)` gives one for keys.
- **Re-enabling it** takes three steps, listed in the comment at the top of the file: add the canvas, create and resize the effect, and call `emit()` from `act`.

## Page wheel (`PageWheel.jsx`)

A Persona 5–inspired half wheel pinned to the left edge (or the top, on narrow screens), shown by experiences with `wheel` (Persona 5). It swings in from the edge when it mounts, after `WHEEL_AT` when the visitor has just switched to it.

- **Labels**: big bold Anton type (self-hosted from `public/fonts/` and preloaded in `index.html`, falling back to Impact), one per category in `content.js`, laid out along rays 34° apart.
- **Spin**:
  - When the XMB changes category, the label wheel and the ticked disc rotate by `--active × −34°` with an overshooting cubic-bezier, so the new page lands on the red marker at 3 o'clock.
  - The active label switches from outline to solid white with a hard black shadow, and plays `wheel-pop`.
  - The marker is remounted with `key` so its `wheel-marker` animation replays.
  - The black tag under the marker shows the view (Browsing / Reading / Viewing) and the focused item, and slides in again when either changes.
- **Clicking a label** dispatches `GOTO`, which closes any open detail or photo and moves the XMB to that page.
- **Sizes**: the wheel fills the strip from `stageInsets()`. Its radius is `0.8 × min(height × 0.4, width × 0.8)`, and everything else scales from the CSS variables `--r` and `--font`.
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

## The model pipeline

- **Source**: `assets-src/psp.glb`, preserved unchanged and excluded from the public build.
- **Build**: `npm run model:optimize` requires Blender and KTX-Software 4.4+ (`ktx` on PATH). `BLENDER_BIN` can override the Blender executable; the usual macOS application path is detected automatically.
- **Blender**: `scripts/prepare-model.py` writes a temporary cleaned export. It welds coincident vertices, removes degenerate and non-manifold internal faces conservatively, recalculates outward normals, keeps the printed front shell intact and decimates the other static parts at a 0.47 ratio, giving 39,590 triangles in the complete model and joins them into `body_low`. Buttons are never decimated. All material faces are single-sided. It retains `screen_low` and the button meshes separately, with their exact names: buttons 1–9, SELECT (14) and START (15).
- **Screen UVs**: planar projection is baked into the export, with U right and V up in the final glTF. The separate screen material carries no atlas texture.
- **Textures**: albedo stays 1536²; emissive shrinks to 512², normal to 768², and metal/roughness to 256². ETC1S compresses albedo/emissive, UASTC with RDO compresses normal/metal/roughness, and all atlas textures have mipmaps. The XMB CanvasTexture continues to use linear filtering without mipmaps.
- **Geometry**: meshopt compression uses one scene quantization grid. Nodes have transforms: halo placement goes through the button matrix and presses move from the rest position.
- **Validation**: `npm run model:check` decodes the shipped asset and requires all 13 mesh names and undecimated buttons, and checks triangle/file budgets, culling, KTX2 textures, and screen UV orientation. The optimizer runs this check before replacing the public asset. Missing tools or failed validation leave the previous asset intact.
- **Output**: `public/models/psp-v3.glb`, 559,248 bytes (453,196 gzip), 13 model draw calls instead of 20. The PSP logo and SELECT/START labels retain their original geometry and straight lettering. The eight menu-button halos give 21 scene draw calls while browsing; Button Rush also lights △ and □, giving 23. Estimated texture GPU allocation is about 2.6 MB minimum; actual allocation depends on supported compression formats.
- **Loading**: `src/modelAsset.js` owns `MODEL_URL` and shares one early fetch between the shell and scene. It starts alongside the lazy three.js import, streams byte progress when an uncompressed length is available, and clears failed downloads for Retry. An HTML fetch preload caused duplicate downloads in WebKit and has been removed.
- **Decoding**: `GLTFLoader.parseAsync` gets the shared bytes, `MeshoptDecoder`, and `KTX2Loader`. Vite emits hashed Basis JS/WASM assets fetched only when KTX2 textures need them.
- **Tradeoff**: v2's JPEG model was 651 KB (410 KB gzip). v3 is smaller before HTTP compression but larger after gzip and needs the Basis transcoder on a cold cache. The gain is lower GPU memory, fewer draw calls, fewer triangles, and no duplicate WebKit model download.
- **New version**: bump the file name in `scripts/optimize-model.sh`, `src/modelAsset.js` and `scripts/check-model.mjs`, then rebuild. The ordinary Vite build uses the committed GLB without requiring Blender or KTX tools.

## Checking changes

`npm test`, `npm run model:check` and `npm run build` must pass. Then run `npm run dev` and check:

- The screen boots: background first, then the menu.
- Arrows move smoothly, Enter opens a write-up, Esc returns.
- Tapping a row focuses it, and tapping the focused row opens it.
- The PSP's D-pad, ✕ and ○ work.
- Links open in a new tab.
- With rotation locked, dragging and Shift+arrows do nothing.
- The PSP loads centred at about 80% of the page with no wheel, on the Start screen with "Tap Start to Begin" underneath. Arrows and scrolling do nothing; ✕, Enter or a tap shows Settings only, with "Select a theme first" underneath. Left/right and scrolling can't leave Settings.
- Classics opens as a folder of the colour themes. Picking any theme fades in the other categories and moves to About; scrolling then walks down the items and on into the next category.
- The screen is red by default. Picking a Classic theme fades the backdrop to it. Reloading always starts back on red Crimson, whatever theme was picked.
- Picking Persona 5 shakes, flips and shrinks the PSP, plays the calling card, swings the wheel in and turns the page and screen red and black. Picking a Classic theme flips it back.
- Picking Grand Theft Auto flips the PSP, plays the cutscene, then shows the Vice City page, the cash bar top right and the skyline skin, with the PSP still centred. Clearing a Button Rush round adds its payout with a `+$` line, and the total survives a reload.
- Picking Black Ops II shows the smoky backdrop, the main menu and Nuketown on the PSP. Clicking a page in the menu drives the PSP.
- In Persona 5, the wheel spins to each page as the XMB changes, and clicking a wheel label jumps there.
- Hovering a PSP button or an on-screen item makes it glow.
- On a phone-sized window, the Persona 5 wheel sits above the PSP and the lighting button moves to the top-right.
- With reduced motion turned on in your OS settings, everything still works without animation.
