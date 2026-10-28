# Performance validation

The Blender and KTX2 follow-ups are implemented by `scripts/prepare-model.py` and `scripts/optimize-model.sh`. The source stays untouched; the site ships `psp-v3.glb`. See [the model pipeline](xmb.md#the-model-pipeline) for prerequisites, texture choices, and the cold-load download tradeoff.

Completed:

- [x] KTX2 conversion for all four atlas textures, with the Basis decoder bundled by Vite.
- [x] Blender cleanup, outward normals, backface culling, 39,980 triangles, and joined static body (9 meshes).
- [x] Keep the screen and seven interactive button meshes separate and named.
- [x] Reduce the emissive map to 512²; retain its atlas details.
- [x] Bake screen UVs and remove the runtime remap.
- [x] Version the shipped asset to v3 and replace the WebKit-duplicated preload with one shared early fetch.
- [x] Add decoded model contract checks and fetch/progress/retry tests.

Validation on the production build (2026-10-25):

- `npm test`: all three fetch/progress/retry checks pass.
- `npm run model:check`: decoded mesh names, screen UV orientation, KTX2 textures, culling and budgets pass.
- Full `npm run model:optimize` and `npm run build` pass (the existing large three.js chunk warning remains).
- Headless Chrome using Metal, desktop Playwright WebKit, and emulated iPhone WebKit load the PSP without JavaScript errors. Screenshots were inspected in all three lighting modes and at the phone viewport.
- Keyboard navigation, detail/back, D-pad, cross, circle, Home, screen focus/confirm and wheel input pass in desktop Chrome and WebKit. Emulated iPhone touch taps pass for the D-pad, cross, circle, Home and screen.
- One model request and one fetch each for the Basis JS/WASM in every browser configuration. The font preload remains in place.
- Observed 16 draw calls per rendered scene frame, roughly 30–31 active frames/s and 12 idle frames/s. Reduced motion settles to zero idle draws.
- A deliberately failed model request shows Retry; restoring the request and clicking Retry loads the PSP.

Physical-device checks still need hardware:

- [ ] Open in the released Safari browser and on a real phone. Check text sharpness, touch input and idle power/frame rate. Automated desktop WebKit and an emulated iPhone viewport do not replace these checks.

## Real-button model rebuild (2026-10-27)

Rebuilt the source with Blender and KTX-Software 4.4.2. The published `psp-v3.glb` now has 39,590 triangles, 13 meshes, and 559,248 bytes (453,196 gzip), within the 40,000 triangle and 651,172 byte budgets. Triangle, square, SELECT, and START remain separate, and every retained button has its original triangle count. The printed front shell also stays intact: decimating it warped the PSP logo, so the remaining static parts use a 0.47 ratio instead. The source stays untouched.

The model checker now requires all 13 meshes and compares button triangle counts with the source. All four textures remain KTX2 with the previous resolutions and allocation. Browsing renders 21 scene draw calls (13 model meshes plus eight button glows); Button Rush renders 23 with triangle and square lit too. Chrome and desktop/mobile Playwright WebKit checks cover real START, triangle, square, and Home clicks/taps, including Button Rush progress and desktop button depression. SELECT/START lettering was visually checked. These are browser/emulation checks; real-device validation remains outstanding.
