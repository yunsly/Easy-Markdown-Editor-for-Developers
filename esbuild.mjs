import { build, context } from 'esbuild';

const buildOptions = {
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
};

if (process.argv.includes('--watch')) {
  const buildContext = await context(buildOptions);
  await buildContext.watch();
} else {
  await build(buildOptions);
}
