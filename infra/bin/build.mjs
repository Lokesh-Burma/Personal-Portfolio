import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
await rm(root+'build',{ recursive: true, force: true });
await mkdir(root+'build',{ recursive: true });
await build({ entryPoints: ['api','worker','dispatcher'].map(n => root+`runtime/${n}-entry.mjs`), outdir: root+'build', outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', target: 'node24', format: 'esm', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }, packages: 'bundle', sourcemap: false, metafile: false });
await writeFile(root+'build/package.json',JSON.stringify({ type: 'module' }));
console.log('Bundled cloud handlers with pinned SDKs; no runtime data or credentials included.');
