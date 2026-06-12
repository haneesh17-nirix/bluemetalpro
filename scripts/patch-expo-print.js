#!/usr/bin/env node
// Patches expo-print@12.8.1 build.gradle to call useDefaultAndroidSdkVersions()
// when expoProvidesDefaultConfig is true. Without this, compileSdkVersion is never
// set when building with AGP 8.3+ (Gradle 8.8) on EAS SDK 51 builds.
const fs = require('fs');
const path = require('path');

const targets = [
  'apps/mobile/node_modules/expo-print/android/build.gradle',
  'node_modules/expo-print/android/build.gradle',
];

const NEEDLE = '    useExpoPublishing()';
const REPLACEMENT = '    useDefaultAndroidSdkVersions()\n    useExpoPublishing()';

let patched = false;
for (const rel of targets) {
  const p = path.resolve(__dirname, '..', rel);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  if (src.includes('useDefaultAndroidSdkVersions()')) {
    console.log(`expo-print already patched at ${rel}`);
    patched = true;
    break;
  }
  if (!src.includes(NEEDLE)) {
    console.warn(`expo-print patch: expected string not found in ${rel}`);
    continue;
  }
  fs.writeFileSync(p, src.replace(NEEDLE, REPLACEMENT));
  console.log(`expo-print patched at ${rel}`);
  patched = true;
  break;
}

if (!patched) {
  console.warn('expo-print patch: build.gradle not found, skipping');
}
