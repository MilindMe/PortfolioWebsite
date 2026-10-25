# Performance follow-ups

Remaining steps of the performance pass started on `perf/load-and-render`. The web side is done; these need KTX-Software and Blender. Delete this file once everything below is ticked.

## 1. KTX2 textures

- [ ] Install KTX-Software 4.3+ from https://github.com/KhronosGroup/KTX-Software/releases (the `.pkg`; it is not on Homebrew). Check with `ktx --version`.
- [ ] Run `npm run model:optimize`. It should no longer print "KTX-Software not found", and `npx gltf-transform inspect public/models/psp-v2.glb` should list the four textures as `image/ktx2`.
- [ ] Check that the page loads the Basis transcoder (`basis_transcoder-*.wasm` in the Network panel) and that the textures look right in Dusky, Golden and Daylight, especially the normal-mapped buttons. If the albedo bands, move `baseColorTexture` from the `etc1s` to the `uastc` line in `scripts/optimize-model.sh`.

The loader is already wired (`KTX2Loader` in `src/MemoriesScene.jsx`). Target: about 50 MB → about 10 MB of texture GPU memory.

## 2. Blender pass on `assets-src/psp.glb`

Import `assets-src/psp.glb`, edit, and export back over it (glTF Binary, +Y up, Apply Modifiers, no cameras or lights, UVs and normals only, no tangents or vertex colours).

- [ ] **Keep these as separate objects with these exact names**, since the code looks them up by name: `screen_low`, `button1_low`–`button4_low` (D-pad), `button6_low` (○), `button7_low` (✕), `button9_low` (Home). See `buttonActions` in `src/xmb/input.js`.
- [ ] **Normals and culling**: Recalculate Outside on every part, and turn on Backface Culling in the material, so the export has `doubleSided: false`. Look around the model in solid view with backface culling on to find any holes.
- [ ] **Remove what isn't seen**: delete internal faces (`middlepart_low` alone has 11.8k vertices), run Merge by Distance, and Decimate flat panels where the silhouette survives. Target: about 35–40k triangles, down from 58k.
- [ ] **Join the non-interactive parts** into one object: `bottompart`, `middlepart`, `toppart`, `cap`, and buttons 5, 8, 10–15. That takes the draw calls from 20 to about 9.
- [ ] **Emissive map**: check what it actually lights. If it is only a few LEDs, bake them into albedo and use a flat emissive colour; otherwise shrink the map to 512².
- [ ] **Screen UVs**: unwrap `screen_low` so its UVs fill 0–1, with U following +X and V following +Y (the same mapping the code currently computes at load).

## 3. Code changes after the new export

- [ ] In `src/MemoriesScene.jsx`, delete the UV remap block under "The screen's UVs point at a placeholder" (keep the material swap).
- [ ] After loading, make the body single-sided: set `side = THREE.FrontSide` on the model's materials, or rely on the export's `doubleSided: false`. Check for missing faces.
- [ ] Bump the model version to `psp-v3.glb` in `scripts/optimize-model.sh`, `MODEL_URL` in `src/MemoriesScene.jsx`, and the preload in `index.html`, then run `npm run model:optimize` and delete the old `psp-v2.glb`.
- [ ] Update `docs/xmb.md` ("Putting it on the PSP" still describes the UV remap) and delete this file.

## Checking

- `npm run build`, then `npm run preview`, and check that the D-pad, ✕, ○ and Home halos sit on their buttons and press, that screen taps and swipes work, and that the XMB text is crisp.
- Log `renderer.info.render.calls` and `renderer.info.memory` once in dev to confirm draw calls and textures.
