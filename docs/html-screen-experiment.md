# HTML screen experiment

On `experiment/html-psp-screen`, detail pages (About Me, Work Experience, Skills,
Education, and projects) render as native React/HTML/CSS over the PSP display.
Menus, photos, and Button Rush retain the existing Canvas renderer. The PSP shell
and its lighting remain WebGL.

Run `npm run dev` and open the URL Vite prints:

- `/`: native HTML detail pages.
- `/?screen=canvas`: the original Canvas detail pages for comparison.

Choose a theme and open About Me or any other detail page. Compare at the same
window size and browser zoom. Try selecting text, scrolling Work Experience,
clicking Back or the résumé, keyboard navigation, and resizing while a page is
open. Native scrolling also works with touch; the physical PSP buttons retain
their existing input bindings.

`NativeScreen.jsx` reads the same content as the Canvas renderer. The scene projects
the model's four screen UV corners into page coordinates. `screenProjection.js`
converts those corners into a CSS perspective transform, hiding the DOM display
when back-facing or edge-on. Its layout size follows the projected screen size,
so browser text renders at the device's pixel density rather than the fixed
960 × 540 Canvas texture resolution. Container units keep the layout proportional
as the PSP enlarges. The projection also follows the rotated phone layout.

The detail content is skipped in `XmbRenderer`, and Canvas updates pause once a
native detail page settles. Opening, closing and switching themes still use the
existing scene animations. DOM scrolling is independent of Canvas scroll state.

This is a visual/rendering experiment, not a complete replacement of XMB. Native
pages use CSS theme treatments and do not receive the model's screen reflections
or tone mapping. As a DOM overlay, they do not participate in WebGL depth testing
with other objects. No frame-rate or GPU performance claim has been established.

Validation: `npm test` covers the existing behavior and the perspective mapping's
four corners, back-facing, degenerate and out-of-camera cases. `npm run build`
checks the production bundle. Browser checks compare both rendering modes and
exercise the native pages, input and screen alignment across theme styles and
phone/desktop sizes.

Browser results for this experiment: all four About pages passed in all ten
available themes. Additional checks passed for project details, native wheel and
keyboard scrolling, the résumé download, the physical PSP Circle button, keyboard
Back, desktop resizing, and 844 × 390 / 390 × 844 touch layouts. Button Rush still
started correctly in Canvas mode. No browser runtime errors were recorded.

In a 700 ms idle check without reduced motion, the settled HTML page caused zero
`XmbRenderer.draw` calls; the Canvas comparison continued drawing. This verifies
the pause of hidden Canvas updates, not an overall GPU or frame-rate improvement.
The production build and all 76 automated tests passed.
