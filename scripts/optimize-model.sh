#!/usr/bin/env bash
# Rebuild the shipped asset from the untouched source, with Blender and KTX 4.4+.
set -euo pipefail
cd "$(dirname "$0")/.."
src=assets-src/psp.glb out=public/models/psp-v3.glb
blender_bin="${BLENDER_BIN:-blender}"
if ! command -v "$blender_bin" >/dev/null; then
  if [[ -x /Applications/Blender.app/Contents/MacOS/Blender ]]; then
    blender_bin=/Applications/Blender.app/Contents/MacOS/Blender
  else
    echo "Blender is required. Set BLENDER_BIN to its executable." >&2
    exit 1
  fi
fi
if ! command -v ktx >/dev/null; then
  echo "KTX-Software 4.4+ is required: https://github.com/KhronosGroup/KTX-Software/releases" >&2
  exit 1
fi
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
"$blender_bin" -b --python scripts/prepare-model.py -- "$src" "$tmp/clean.glb"
# Smoothness needs less spatial detail than the labels and normal map.
./node_modules/.bin/gltf-transform resize "$tmp/clean.glb" "$tmp/resized.glb" --pattern "*metallic*" --width 256 --height 256
# Colour data compresses well as ETC1S; normal/metal/roughness use UASTC.
./node_modules/.bin/gltf-transform etc1s "$tmp/resized.glb" "$tmp/color.glb" --slots "{baseColorTexture,emissiveTexture}"
./node_modules/.bin/gltf-transform uastc "$tmp/color.glb" "$tmp/textures.glb" --slots "{normalTexture,metallicRoughnessTexture}" --level 2 --zstd 18 --resize 768 --rdo --rdo-lambda 0.5 --rdo-multithreading false
./node_modules/.bin/gltf-transform meshopt "$tmp/textures.glb" "$tmp/model.glb" --quantization-volume scene
# Publish only after every stage succeeds; a missing encoder never ships JPEGs.
node scripts/check-model.mjs "$tmp/model.glb"
cp "$tmp/model.glb" "$out"
./node_modules/.bin/gltf-transform inspect "$out" --format md
