import { build } from 'esbuild';

await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['vscode'],
  outfile: 'dist/extension.js',
  sourcemap: true,
  sourcesContent: false,
  logLevel: 'info',
});
