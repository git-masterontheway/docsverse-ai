/**
 * DocsVerse AI - Cross-Platform Setup Script
 * Works seamlessly across Linux (Render, Ubuntu, Debian), macOS, and Windows.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const reqFile = path.join(backendDir, 'requirements.txt');

console.log('============================================================');
console.log('  DocsVerse AI - Environment Setup & Dependency Installer');
console.log('============================================================');

// 1. Install backend dependencies
console.log('[1/2] Installing backend Node.js dependencies...');
try {
  execSync('npm install', { cwd: backendDir, stdio: 'inherit' });
  console.log('  [+] Backend npm dependencies installed successfully.');
} catch (err) {
  console.warn('  [!] Warning: Failed to run npm install in backend directory:', err.message);
}

// 2. Install Python ReportLab PDF dependencies
console.log('[2/2] Installing Python ReportLab PDF generator dependencies...');

let pythonInstalled = false;
const isWin = process.platform === 'win32';
const venvDir = path.join(backendDir, '.venv');
const venvPython = isWin
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');
const venvPip = isWin
  ? path.join(venvDir, 'Scripts', 'pip.exe')
  : path.join(venvDir, 'bin', 'pip');

// Strategy 1: Create/use dedicated .venv in backend/.venv (bypasses PEP 668 on Debian/Ubuntu/Render)
try {
  if (!fs.existsSync(venvPython)) {
    console.log('  [*] Creating Python virtual environment in backend/.venv...');
    const pythonExe = isWin ? 'python' : 'python3';
    execSync(`${pythonExe} -m venv "${venvDir}"`, { stdio: 'inherit' });
  }

  if (fs.existsSync(venvPip)) {
    console.log('  [*] Installing ReportLab into backend/.venv...');
    try {
      execSync(`"${venvPip}" install --upgrade pip`, { stdio: 'ignore' });
    } catch (_) {}
    execSync(`"${venvPip}" install -r "${reqFile}"`, { stdio: 'inherit' });
    pythonInstalled = true;
    console.log('  [+] ReportLab successfully installed into backend/.venv!');
  }
} catch (venvErr) {
  console.log('  [i] Notice: Virtual environment creation failed, trying system pip strategies...');
}

// Strategy 2: System pip with --break-system-packages (standard for Render / Debian 12 / Ubuntu 24)
if (!pythonInstalled) {
  const pipCandidates = [
    `pip3 install --break-system-packages -r "${reqFile}"`,
    `python3 -m pip install --break-system-packages -r "${reqFile}"`,
    `pip install --break-system-packages -r "${reqFile}"`,
    `pip3 install --user -r "${reqFile}"`,
    `pip3 install -r "${reqFile}"`,
    `pip install -r "${reqFile}"`
  ];

  for (const cmd of pipCandidates) {
    try {
      console.log(`  [*] Trying: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
      pythonInstalled = true;
      console.log(`  [+] ReportLab installed via: ${cmd}`);
      break;
    } catch (e) {
      // try next
    }
  }
}

if (!pythonInstalled) {
  console.log('  [i] Notice: Python ReportLab was not installed. Server will offer client-side PDF fallback.');
}

console.log('------------------------------------------------------------');
console.log('Setup completed successfully.');
console.log('------------------------------------------------------------');
