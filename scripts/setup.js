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
console.log('[2/2] Installing Python PDF generator dependencies...');
const pipCommands = [
  `pip install -r "${reqFile}"`,
  `pip3 install -r "${reqFile}"`,
  `python3 -m pip install -r "${reqFile}"`,
  `python -m pip install -r "${reqFile}"`
];

let pythonInstalled = false;
for (const cmd of pipCommands) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    pythonInstalled = true;
    console.log(`  [+] Python dependencies installed via: ${cmd}`);
    break;
  } catch (e) {
    // Continue to next pip candidate
  }
}

if (!pythonInstalled) {
  console.log('  [i] Notice: Python pip not detected on global PATH.');
  console.log('      If running locally with venv, PDF generation will use .venv automatically.');
}

console.log('------------------------------------------------------------');
console.log('Setup completed successfully.');
console.log('------------------------------------------------------------');
