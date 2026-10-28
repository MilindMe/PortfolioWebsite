import {defineConfig} from 'vite';
import {portfolioHtml} from './scripts/portfolio-html.mjs';

export default defineConfig({
  plugins: [portfolioHtml()],
  // KTX2Loader finds its Basis transcoder at ../libs/basis/ relative to its own file. Pre-bundling moves it into
  // node_modules/.vite/deps, where that path doesn't exist and the dev server answers with index.html, so the
  // model never finishes loading. Serving three.js as-is keeps the relative path intact; builds are unaffected.
  optimizeDeps: {exclude: ['three']},
});
