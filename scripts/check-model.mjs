import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';

// These are runtime contracts: a valid glTF can still silently break controls,
// screen picking, backface culling or the texture memory budget.
const url = process.argv[2] ? pathToFileURL(resolve(process.argv[2]))
  : new URL('../public/models/psp-v3.glb', import.meta.url);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.decoder': MeshoptDecoder});
const bytes = new Uint8Array(await readFile(url));
const document = await io.readBinary(bytes);
const root = document.getRoot();
const names = ['body_low', 'screen_low', ...[1, 2, 3, 4, 6, 7, 9].map(i => `button${i}_low`)];
const nodes = root.listNodes().filter(node => node.getMesh());
assert.deepEqual(nodes.map(node => node.getName()).sort(), names.sort());
assert(root.listMaterials().every(material => !material.getDoubleSided()));
assert.equal(root.listTextures().length, 4);
assert(root.listTextures().every(texture => texture.getMimeType() === 'image/ktx2'));
// Bound mipmapped 4x4 compressed texture allocation at 16 bytes/block (BC7
// or ASTC). Devices falling back to uncompressed RGBA need more memory.
let compressedTextureBytes = 0;
for (const texture of root.listTextures()) {
  let [width, height] = texture.getSize();
  for (;;) {
    compressedTextureBytes += Math.ceil(width/4) * Math.ceil(height/4) * 16;
    if (width === 1 && height === 1) break;
    width = Math.max(1, Math.floor(width/2));height = Math.max(1, Math.floor(height/2));
  }
}
assert(compressedTextureBytes < 10_000_000, 'Compressed texture allocation exceeds 10MB');
assert(root.listExtensionsRequired().some(extension => extension.extensionName === 'EXT_meshopt_compression'));
assert(root.listExtensionsRequired().some(extension => extension.extensionName === 'KHR_texture_basisu'));
const triangles = root.listMeshes().flatMap(mesh => mesh.listPrimitives())
  .reduce((total, primitive) => total + primitive.getIndices().getCount() / 3, 0);
assert(triangles <= 40000, `Triangle budget exceeded: ${triangles}`);
assert(bytes.length < 651172, 'Model must stay smaller than the previous 651KB asset');
const screen = nodes.find(node => node.getName() === 'screen_low');
const primitive = screen.getMesh().listPrimitives()[0];
for (const slot of ['BaseColor', 'Normal', 'Emissive', 'MetallicRoughness', 'Occlusion']) {
  assert.equal(primitive.getMaterial()[`get${slot}Texture`](), null);
}
const position = primitive.getAttribute('POSITION'), uv = primitive.getAttribute('TEXCOORD_0');
const points = Array.from({length: position.getCount()}, (_, i) => position.getElement(i, []));
const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
for (let i = 0; i < points.length; i++) {
  const [u, v] = uv.getElement(i, []);
  // Small tolerance for position/UV quantization. V must increase upward so
  // both CanvasTexture and raycast-based screen taps keep their orientation.
  assert(Math.abs(u - (points[i][0]-minX)/(maxX-minX)) < .001, `Incorrect U at ${i}`);
  assert(Math.abs(v - (points[i][1]-minY)/(maxY-minY)) < .001, `Incorrect V at ${i}`);
}
for (const file of ['../src/modelAsset.js', './optimize-model.sh']) {
  assert((await readFile(new URL(file, import.meta.url), 'utf8')).includes('psp-v3.glb'), `Stale model path in ${file}`);
}
console.log(JSON.stringify({triangles, meshes: nodes.length, modelBytes: bytes.length,
  gzipBytes: gzipSync(bytes).length, compressedTextureBytes, textures: root.listTextures().map(texture => ({
    name: texture.getName(), size: texture.getSize(), mime: texture.getMimeType()
  }))}, null, 2));
