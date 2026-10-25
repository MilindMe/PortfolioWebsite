#!/usr/bin/env bash
# Builds the shipped model from the Blender export: KTX2 textures (when KTX-Software is installed), then meshopt
# geometry. Source: assets-src/psp.glb. Output: public/models/psp-v2.glb (bump the version and update MODEL_URL in
# src/MemoriesScene.jsx and the preload in index.html whenever the output changes, so caches pick it up).
set -euo pipefail
cd "$(dirname "$0")/.."
src=assets-src/psp.glb out=public/models/psp-v2.glb tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp "$src" "$tmp/model.glb"
if command -v ktx >/dev/null || command -v toktx >/dev/null; then
  # Colour data compresses well as ETC1S; normals and metal/roughness need UASTC to stay accurate.
  npx gltf-transform etc1s "$tmp/model.glb" "$tmp/model.glb" --slots "{baseColorTexture,emissiveTexture}"
  npx gltf-transform uastc "$tmp/model.glb" "$tmp/model.glb" --slots "{normalTexture,metallicRoughnessTexture}" --level 2 --zstd 18
else
  echo "KTX-Software not found: keeping JPEG textures. Install it from https://github.com/KhronosGroup/KTX-Software/releases" >&2
fi
# One quantization grid for the whole model, so every node gets the same plain scale.
npx gltf-transform meshopt "$tmp/model.glb" "$out" --quantization-volume scene
npx gltf-transform inspect "$out" --format md | head -40
