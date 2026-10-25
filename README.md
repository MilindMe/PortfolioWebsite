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

The main page renders the original interactive PSP scene, dot background, camera reset, three lighting presets, loading screen, and retry control. Drag the PSP to rotate it, or focus the scene and use the arrow keys.

- `src/App.jsx`: page shell and controls.
- `src/MemoriesScene.jsx`: original Three.js scene.
- `src/lighting.js`: original lighting presets.
- `public/models/psp.glb`: self-contained copy of the source project’s exported PSP model; no sibling directory is needed at runtime.

The music shop’s other pages, navigation, and audio player are excluded from this starting point.
