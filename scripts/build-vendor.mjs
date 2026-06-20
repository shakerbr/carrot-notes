import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('src/vendor', { recursive: true });

await esbuild.build({
  entryPoints: ['scripts/codemirror-entry.js'],
  outfile: 'src/vendor/codemirror.bundle.js',
  bundle: true,
  format: 'iife',
  globalName: 'CarrotCM',
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

console.log('Built src/vendor/codemirror.bundle.js and marked.bundle.js');
