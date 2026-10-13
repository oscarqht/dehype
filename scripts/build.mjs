import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targets = ['chrome', 'firefox'];

async function cleanAndMkdir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function copyDirectory(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function buildTarget(target) {
  const outDir = path.join(rootDir, 'dist', target);
  console.log(`\n📦 Building Dehype Extension for [${target.toUpperCase()}] -> dist/${target}`);
  await cleanAndMkdir(outDir);

  // 1. Bundle Background script
  // Chrome MV3 supports ESM service workers; Firefox MV3 supports IIFE/scripts
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/background/index.ts')],
    outfile: path.join(outDir, 'background.js'),
    bundle: true,
    format: target === 'chrome' ? 'esm' : 'iife',
    platform: 'browser',
    target: ['es2022'],
    sourcemap: false,
    minify: false,
  });

  // 2. Bundle Content script (always IIFE so it injects safely into Twitter)
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/content/index.ts')],
    outfile: path.join(outDir, 'content.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    sourcemap: false,
    minify: false,
  });

  // 3. Bundle Options script
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/options/index.ts')],
    outfile: path.join(outDir, 'options/index.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    sourcemap: false,
    minify: false,
  });

  // 4. Bundle Popup script
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/popup/index.ts')],
    outfile: path.join(outDir, 'popup/index.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    sourcemap: false,
    minify: false,
  });

  // 5. Copy Manifest
  const manifestSrc = path.join(rootDir, `src/manifest.${target}.json`);
  const manifestDest = path.join(outDir, 'manifest.json');
  copyFileSafe(manifestSrc, manifestDest);

  // 6. Copy HTML & CSS
  copyFileSafe(path.join(rootDir, 'src/content/styles.css'), path.join(outDir, 'content.css'));
  copyFileSafe(path.join(rootDir, 'src/options/index.html'), path.join(outDir, 'options/index.html'));
  copyFileSafe(path.join(rootDir, 'src/options/styles.css'), path.join(outDir, 'options/styles.css'));
  copyFileSafe(path.join(rootDir, 'src/popup/index.html'), path.join(outDir, 'popup/index.html'));
  copyFileSafe(path.join(rootDir, 'src/popup/styles.css'), path.join(outDir, 'popup/styles.css'));

  // 7. Copy Icons
  copyDirectory(path.join(rootDir, 'public/icons'), path.join(outDir, 'icons'));

  console.log(`✅ ${target.toUpperCase()} build complete!`);
}

async function run() {
  const startTime = Date.now();
  for (const target of targets) {
    await buildTarget(target);
  }
  console.log(`\n🎉 All targets built in ${Date.now() - startTime}ms`);
}

run().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
