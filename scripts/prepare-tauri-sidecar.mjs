import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const profileArg = process.argv[2] ?? 'debug';
const profile = profileArg === 'release' ? 'release' : 'debug';

const platform = process.platform;
const arch = process.arch;

const targetTriple = (() => {
  if (platform === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (platform === 'darwin' && arch === 'x64') return 'x86_64-apple-darwin';
  if (platform === 'win32' && arch === 'x64') return 'x86_64-pc-windows-msvc';
  if (platform === 'linux' && arch === 'x64') return 'x86_64-unknown-linux-gnu';
  throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
})();

const exeExt = platform === 'win32' ? '.exe' : '';

const findFirstExisting = (candidates) => {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const ensureTauriIcons = () => {
  const iconsDir = path.join(projectRoot, 'src-tauri', 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  const pngSource = findFirstExisting([
    path.join(
      projectRoot,
      'node_modules',
      '.pnpm',
      'electron-builder@26.0.12_electron-builder-squirrel-windows@26.0.12',
      'node_modules',
      'app-builder-lib',
      'templates',
      'icons',
      'electron-linux',
      '256x256.png'
    ),
    path.join(projectRoot, 'node_modules', 'electron-builder', 'templates', 'icons', 'electron-linux', '256x256.png'),
  ]);

  const icnsSource = findFirstExisting([
    path.join(projectRoot, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'Resources', 'electron.icns'),
  ]);

  const icoSource = findFirstExisting([
    path.join(
      projectRoot,
      'node_modules',
      '.pnpm',
      'electron-builder@26.0.12_electron-builder-squirrel-windows@26.0.12',
      'node_modules',
      'app-builder-lib',
      'templates',
      'icons',
      'proton-native',
      'proton-native.ico'
    ),
    path.join(projectRoot, 'node_modules', 'electron-builder', 'templates', 'icons', 'proton-native', 'proton-native.ico'),
  ]);

  const targets = [
    { src: pngSource, dst: path.join(iconsDir, 'icon.png') },
    { src: icnsSource, dst: path.join(iconsDir, 'icon.icns') },
    { src: icoSource, dst: path.join(iconsDir, 'icon.ico') },
  ];

  for (const t of targets) {
    if (!t.src) continue;
    fs.copyFileSync(t.src, t.dst);
  }
};

const backRustDir = path.join(projectRoot, 'back-rust');
const manifestPath = path.join(backRustDir, 'Cargo.toml');

ensureTauriIcons();

const cargoArgs = ['build', '--manifest-path', manifestPath];
if (profile === 'release') cargoArgs.push('--release');

const buildResult = spawnSync('cargo', cargoArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const builtBinaryPath = path.join(backRustDir, 'target', profile, `back-rust${exeExt}`);
if (!fs.existsSync(builtBinaryPath)) {
  throw new Error(`Built binary not found: ${builtBinaryPath}`);
}

const binariesDir = path.join(projectRoot, 'src-tauri', 'binaries');
fs.mkdirSync(binariesDir, { recursive: true });

const sidecarPath = path.join(binariesDir, `back-rust-${targetTriple}${exeExt}`);
fs.copyFileSync(builtBinaryPath, sidecarPath);

if (platform !== 'win32') {
  fs.chmodSync(sidecarPath, 0o755);
}

process.stdout.write(`Prepared sidecar: ${path.relative(projectRoot, sidecarPath)}\n`);
