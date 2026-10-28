# Editing the content

Where every piece of text, link, image and setting lives, and how to change it. Most edits are one file. Run `npm run dev` to see them live, and `npm test` before committing: the tests catch structural mistakes such as a missing Classics folder or a broken reading page.

## The golden rule for `src/xmb/content.js`

`content.js` holds **content and structure together**. Change the strings freely, but keep these pieces, or features break:

| Keep | Why |
| --- | --- |
| `themeItem`, `RESUME_URL`, `RESUME_FILE` and `resume` at the top | Settings, the résumé buttons and the quick links use them. |
| The **Settings** category exactly as it is (the `classics` folder plus `...themes.filter(...)`) | It's built from `themes.js`. Hand-writing it loses the Classics folder. |
| The ids `bio`, `button-rush`, `github`, `linkedin`, `email`, `resume` | The name in the corner opens `bio`, the quick links read `github` and `linkedin`, and Button Rush is opened by `game:'button-rush'`. |
| `focus:true` on project, About me and Experience pages | It marks them as reading pages: the game themes tuck their wheel away and the PSP grows back while they're open. |
| `blocks:[...]` on About me and Experience | That's the laid-out page format (headings, bullets, timeline). A plain `body` works too, but loses the layout. |

If you paste an older copy of the file over it, compare it with `git diff` first. That's how the Classics folder went missing once.

## Common edits

### Projects
`content.js` → the `projects` category. Each item is:

```js
{id:'music-website', label:'Music Website', sub:'React · Node', icon:'code',
 detail:{title:'Music Website', focus:true, body:'What it is, what you built, what you learned.\n\nA blank line starts a new paragraph.',
  links:[{label:'GitHub', url:'https://github.com/...'}, {label:'Live demo', url:'https://...'}]}},
```

- `label` is the menu row, `sub` the line under it, `detail.title` the page heading.
- The screen is small (480 × 270) and scrolls with ↑ ↓, so keep it short.
- Up to three or four `links` fit along the bottom.

### About me, Experience, Skills, Education
`content.js` → the `about` category.

- **About me** (`bio`), **Experience** and **Education** use `blocks` (see [Page blocks](#page-blocks)).
- **Skills** uses a plain `body`. `\n` starts a new line.

### Page blocks
Any `detail` can use `blocks:[...]` instead of `body`. They stack top to bottom, and the page scrolls if they run long.

| Block | What it draws |
| --- | --- |
| `{type:'h', text}` | A heading in capitals, with a short underline |
| `{type:'p', text}` | A paragraph |
| `{type:'list', items:['...', '...']}` | Bullet points |
| `{type:'timeline', entries:[{when, role, org, points:[...], current}]}` | The Experience timeline; `current:true` lights the dot |
| `{type:'image', src, alt, align:'right', width}` | A picture floated to the `right` (or `left`). The blocks after it wrap beside it until they pass its bottom. `width` is in screen units (the page is about 412 wide); `height` defaults to the same, for a square. It's fitted whole, never cropped, so logos work well. |
| `{type:'image', src, alt, height, caption}` | No `align`: a full-width banner, cropped to fill `height` (default 165), with an optional caption under it |
| `{type:'grid', columns:2, items:[{image, alt, title, text}]}` | Cards in columns, each with an optional picture on top (cropped to fill), a bold title and a short line. Cards in a row share a height. `imageHeight` overrides the picture height. |

Education is the worked example: the university seal floated right, beside a heading and two lines.

```js
detail:{title:'Education', blocks:[
 {type:'image', src:'/education/uw-seal.webp', alt:'University of Waterloo seal', align:'right', width:76},
 {type:'h', text:'University of Waterloo'},
 {type:'p', text:'Combinatorics & Optimization + Statistics'},
 {type:'p', text:'Minor in Computing'},
]}
```

A newsletter-style page is the same pieces in order: a banner `image`, an `h`, a `p`, then a `grid`.

**Pictures for pages:**
- Put them under `public/` (for example `public/education/`) and reference them from `/`, like `'/education/uw-seal.webp'`.
- Use WebP, small: about 256 px for a logo and 400–500 px wide for a banner or card. The whole PSP screen is only 960 px across.
- Always give an `alt`. Screen readers hear it, and the picture itself only downloads when its page is first opened.
- A missing file shows a faint placeholder box, not an error.

### Contact, email, GitHub, LinkedIn
`content.js` → the `contact` category. Each item's `link` is opened directly.

- **Email:** change both `sub` (what's shown) and `link` (`mailto:...`).
- **GitHub and LinkedIn:** the `link` here also drives the **quick-link icons** in the top-right corner (`src/QuickLinks.jsx`), so change it once here. LinkedIn profile links look like `https://www.linkedin.com/in/<your-handle>`.

### Résumé
- **The file:** put your PDF at `public/resume.pdf`, replacing it to update. Until it exists, every résumé link 404s.
- **Download name:** `RESUME_FILE` at the top of `content.js`, currently `Milind-Meetarbhan-Resume.pdf`. Also change the `filename=` in `public/_headers`, which makes Cloudflare Pages download the file even when its URL is opened directly.
- **Where it's linked:** About me, Experience, Contact and the quick links. It always downloads and never opens a tab.

### Memories (photos)
- **Photos:** put them in `public/memories/` (create the folder) as WebP, at most 960 px wide.
- **Menu items:** in `content.js` → the `memories` category. Each item has `photo:'/memories/<file>'` and a `caption`. Until a file exists, the screen says where to add it.

### Games
`content.js` → the `games` category. Button Rush is `{..., game:'button-rush'}`; keep that field.

For Button Rush's own settings, see [Game tuning](#game-tuning) below.

## Text outside the PSP

| What | Where |
| --- | --- |
| Browser tab title and search description | `index.html` (`<title>`, `<meta name="description">`) |
| Your name in the top-left corner | `src/App.jsx`, search for `Milind Meetarbhan`. GTA shows it as an image instead (`public/experiences/gta/name.png`, set in Pricedown), so a name change needs a new image too. |
| "Press Start" / "Select a theme first" under the PSP | `src/App.jsx`, the `theme-prompt` line |
| "START" and "Press ✕ or tap the screen" on the PSP | `src/xmb/XmbRenderer.js`, `startScreen()` |
| Loading screen ("Loading...", "Desktop is recommended...") | `src/LoadingScreen.jsx` |
| Phone notice | `src/PhoneNotice.jsx` |
| Quick-link icons (top right) | `src/QuickLinks.jsx`; the URLs come from `content.js` (see above) |
| GTA cutscene subtitle | `src/experiences/gta/GtaCutscene.jsx` |
| Persona 5 calling card ("Take your heart") | `src/experiences/persona5/CallingCard.jsx` |
| Black Ops II menu mode names (Campaign, Zombies, ...) | `modes` in `src/experiences/bo2/MainMenu.jsx`, keyed by category id |
| Trophies (title, description, grade) | `src/trophies.js`; see [Trophies](#trophies) |

## Trophies
Each trophy is earned once per visitor (kept in the browser) and pops up as a PS3-style card in the top-right corner.

| Trophy | Grade | Earned by |
| --- | --- | --- |
| Getting to know me! | Gold | Opening About me (from the menu or by clicking your name) |
| Potential employer? | Silver | Opening Experience |
| Hard-worker | Bronze | Opening Skills |
| um.. actually | Bronze | Opening Education |
| clicky clicky | Bronze | Starting Button Rush for the first time |
| Earnest Interest | Silver | Opening any project |
| Switchin' it up | Bronze | Picking a second theme after the first |
| Fastest fingers on the PSP | Gold | Clearing all four rounds of Button Rush (not needed for the platinum) |
| G.O.A.T | Platinum | Earning the seven above it (the `requires` list) |

- **Wording or grade:** change `title`, `description` or `grade` in `src/trophies.js`. The grade is one of `bronze`, `silver`, `gold` or `platinum`.
- **What earns them:** `trophiesFor()` in `src/xmb/state.js`. The page trophies are matched by item id in `PAGE_TROPHIES`, so renaming an item's `id` in `content.js` breaks its trophy.
- **Adding one:** add it to `trophies`, add a rule in `trophiesFor()`, and add its id to G.O.A.T's `requires` if it should count towards the platinum.
- **Testing:** in `npm run dev`, run `awardTrophy('about-me')` in the browser console to try a card. Run `localStorage.removeItem('trophies-earned')` to start over.

## Themes
`src/xmb/themes.js`.

- **Colour themes:** add an entry with `experience:'classic'` and its two backdrop colours, `colors:['#top','#bottom']`. It appears in the Classics folder automatically.
- **Labels:** `label` and `sub` are what Settings shows.
- **Default:** every visit starts on `DEFAULT_THEME` (Crimson). Themes are deliberately not remembered between visits.
- **Black Ops II** is behind two feature flags in `src/features.js`:
  - `bo2Theme` (on) offers the basic theme: the dark tactical backdrop and the Nuketown screen skin, with the PSP centred.
  - `bo2ThemeAdvanced` (off) adds the in-game HUD round the PSP and the Main Menu beside it. While it's off, the theme's Settings line reads "Full theme coming soon".
  - Any theme can be put behind a flag by giving it `feature:'<flag name>'` in `themes.js`.

## Game tuning
`src/xmb/game.js`.

- **Rounds:** `ROUNDS` sets how many buttons and how much time each round has.
- **Round card:** `READY_FOR` is how long the "Round n" card shows.
- **GTA cash:** `PAYOUTS` is what each cleared round pays in the GTA theme. If you add a round, add a payout too.

The GTA cash bar's digits are an image. To redraw it, see `scripts/render-cash-sprite.py`.

## Images and other assets

| What | Where |
| --- | --- |
| Vice City backdrop (GTA) | `public/experiences/gta/vice-city.jpg` |
| Nuketown on the PSP (Black Ops II) | `public/experiences/bo2/nuketown.jpg` |
| GTA name image | `public/experiences/gta/name.png` |
| GTA cash digits | `public/experiences/gta/cash.png` + `src/experiences/gta/cashGlyphs.js`, both generated by `scripts/render-cash-sprite.py` |
| Menu sounds | `public/sounds/` (see `src/sound.js`) |
| Pictures on pages (Education seal, cards, banners) | `public/education/` and any folder you add under `public/`; see [Page blocks](#page-blocks) |
| Menu icons | `src/xmb/icons.js`: an item's `icon` must be one of the names there, otherwise it shows sparkles |
| The PSP model | `public/models/psp-v3.glb`, built from `assets-src/psp.glb` by `npm run model:optimize` (needs Blender and KTX-Software). A rebuild is pending; see **The model pipeline** in `docs/xmb.md` for the steps. |

## Checklist before committing content
1. `npm run dev` and click through what you changed.
2. Run `npm test` and make sure it passes.
3. Run `git diff src/xmb/content.js` and check only the text you meant to change has changed.

### Leave a memo

Memories shows a “+ Leave a memo!” button beneath the PSP. `src/LeaveMemo.jsx` opens a native dialog with an invite-code step and a message form. Set the hard-coded invite code in `src/memo.js` (`CAMWAD-MILIND`); matching ignores case and surrounding spaces. The recipient comes from Contact’s email item in `src/xmb/content.js`. “Open email draft” fills the subject and message in the visitor’s email app, where a photo can be attached. Memories are added to the site manually after review. This flow uses no backend and stores neither codes nor draft messages in browser storage.
