import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const watchIntervalMs = 300;
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = fileURLToPath(new URL('./src', import.meta.url));
const viteEntryPoint = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
);
const viteConfig = fileURLToPath(new URL('./vite.config.ts', import.meta.url));

async function createSourceSnapshot(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const snapshotParts = [];

  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      snapshotParts.push(await createSourceSnapshot(entryPath));
    } else if (entry.isFile()) {
      const contents = await readFile(entryPath);
      snapshotParts.push(entryPath, contents.toString('base64'));
    }
  }

  return snapshotParts.join('\0');
}

async function createWatchSnapshot() {
  const sourceSnapshot = await createSourceSnapshot(sourceRoot);
  const configContents = await readFile(viteConfig);

  return `${sourceSnapshot}\0${configContents.toString('base64')}`;
}

async function buildWebview() {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [viteEntryPoint, 'build', '--config', viteConfig],
      {
        cwd: projectRoot,
        stdio: 'inherit',
      },
    );

    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    console.error(`[watch] Webview build failed with exit code ${exitCode}.`);
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

let previousSnapshot = await createWatchSnapshot();

await buildWebview();
console.log('[watch] Webview build finished, watching for changes...');

while (true) {
  await wait(watchIntervalMs);

  const nextSnapshot = await createWatchSnapshot();

  if (nextSnapshot === previousSnapshot) {
    continue;
  }

  previousSnapshot = nextSnapshot;
  console.log('[watch] Webview source changed, rebuilding...');
  await buildWebview();
}
