import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('src/vendor', { recursive: true });

await esbuild.build({
  entryPoints: ['scripts/tiptap-entry.js'],
  outfile: 'src/vendor/tiptap.bundle.js',
  bundle: true,
  format: 'iife',
  globalName: 'CarrotEditor',
  minify: true,
  target: ['es2020'],
});

await esbuild.build({
  entryPoints: ['scripts/marked-entry.js'],
  outfile: 'src/vendor/marked.bundle.js',
  bundle: true,
  format: 'iife',
  globalName: 'CarrotMarked',
  minify: true,
  target: ['es2020'],
});

console.log('Built src/vendor/tiptap.bundle.js and marked.bundle.js');
