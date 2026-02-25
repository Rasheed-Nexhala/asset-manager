#!/usr/bin/env node
/**
 * One-time script to fetch missing expo-dev-menu resources from expo/expo sdk-54.
 * Run: node scripts/patch-expo-dev-menu.js
 * Then: npx patch-package expo-dev-menu
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/expo/expo/sdk-54/packages/expo-dev-menu/android/src/main/res';
const TARGET = path.join(__dirname, '../node_modules/expo-dev-menu/android/src/main/res');

const FONTS = ['jetbrains_mono_light.ttf', 'jetbrains_mono_regular.ttf', 'jetbrains_mono_medium.ttf'];
const DRAWABLES = ['alert.xml', 'bug.xml', 'copy.xml', 'fast_refresh.xml', 'home.xml', 'inspect.xml', 'performance.xml', 'refresh.xml', 'x_close.xml'];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const fontDir = path.join(TARGET, 'font');
  const drawableDir = path.join(TARGET, 'drawable');
  ensureDir(fontDir);
  ensureDir(drawableDir);

  const jetbrainsExists = fs.existsSync(path.join(fontDir, 'jetbrains_mono_light.ttf'));
  const xCloseExists = fs.existsSync(path.join(drawableDir, 'x_close.xml'));
  if (jetbrainsExists && xCloseExists) {
    return; // Already patched
  }

  for (const f of FONTS) {
    const url = `${BASE}/font/${f}`;
    const dest = path.join(TARGET, 'font', f);
    process.stdout.write(`Fetching ${f}... `);
    const data = await fetch(url);
    fs.writeFileSync(dest, data);
    console.log('OK');
  }

  for (const f of DRAWABLES) {
    const url = `${BASE}/drawable/${f}`;
    const dest = path.join(TARGET, 'drawable', f);
    process.stdout.write(`Fetching ${f}... `);
    const data = await fetch(url);
    fs.writeFileSync(dest, data);
    console.log('OK');
  }

  console.log('\nDone. expo-dev-menu resources patched.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
