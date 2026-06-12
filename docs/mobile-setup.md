# Mobile App — Setup & Build Guide

React Native (Expo 51 / SDK 51) — Android + iOS via EAS Build.

## Prerequisites

- Node.js 22+
- npm 10+
- Expo account at [expo.dev](https://expo.dev) (project: `haneesh17/bluemetal-pro`)
- EAS CLI: `npm install -g eas-cli`

## Local Development

```bash
# From repo root
npm install

# Start Metro bundler
npm run start --workspace=apps/mobile

# Or scan the QR code with Expo Go (Android/iOS)
```

Set `EXPO_PUBLIC_API_URL` before starting:

```bash
echo "EXPO_PUBLIC_API_URL=http://<your-local-ip>:3001/api" > apps/mobile/.env
```

Use your machine's LAN IP (not `localhost`) so the device/emulator can reach the backend.

## EAS Builds

Builds run on Expo's cloud infrastructure. The GitHub Actions workflow (`mobile.yml`) triggers a build on every push to `main`.

### Manual build

```bash
cd apps/mobile
eas build --platform android --profile preview
```

Profiles are defined in `eas.json`:

| Profile | Platform | Output | Usage |
|---------|----------|--------|-------|
| `preview` | Android | APK | Internal testing — sideload on any device |
| `production` | Android + iOS | AAB / IPA | Store submission |

### Environment variables

EAS builds do not automatically use `.env` or GitHub Actions secrets for `EXPO_PUBLIC_*` variables.

You must add them in the **Expo dashboard**:

1. Go to [expo.dev/accounts/haneesh17/projects/bluemetal-pro](https://expo.dev/accounts/haneesh17/projects/bluemetal-pro)
2. Settings → Environment variables
3. Add `EXPO_PUBLIC_API_URL` = `https://api.bluemetalpro.in/api`
4. Set visibility to **Secret** (only available during builds, not exposed to users)

Without this variable, the app will fail to connect to the backend on production builds.

## Dependency Notes

The mobile app uses exact pins for several packages to avoid version conflicts in the Expo SDK 51 / RN 0.74 build environment:

| Package | Pinned version | Reason |
|---------|---------------|--------|
| `react-native-gesture-handler` | `2.16.2` | 3.x requires New Architecture APIs not present in RN 0.74 old-arch mode; also pulls `androidx.core:1.16.0` which requires compileSdk 35 |
| `expo-print` | `~12.8.1` | 13.x is SDK 52 only; SDK 51 needs 12.x |
| `@react-navigation/stack` | `^6.3.29` | 6.4.x bumped gesture-handler peer dep to `^3.0.0` |
| `typescript` | `^5.4.0` | 5.3.x causes JSX type errors with RN 0.74 bundled types |

The root `package.json` has `"overrides": { "react-native-gesture-handler": "2.16.2" }` to prevent any transitive dependency from pulling in a newer version.

### Adding a new dependency

Always use the Expo SDK version picker first:

```bash
cd apps/mobile
npx expo install <package>
```

If expo doctor reports a version warning on a package that is intentionally pinned, add it to the `expo.install.exclude` list in `apps/mobile/package.json`.

### Running expo doctor

```bash
cd apps/mobile
npx expo-doctor
```

Expected warnings (all intentional — do not "fix"):
- `react-native-gesture-handler` — pinned to 2.16.2, not expo's suggestion of ^3
- `@types/react-native` — kept for JSX compatibility with SDK 51
- `typescript` — pinned to ^5.4.0

## Build Troubleshooting

### Kotlin compilation errors in `react-native-gesture-handler`

```
e: RNGestureHandlerButtonViewManager.kt: Unresolved reference: BackgroundStyleApplicator
```

Cause: gesture-handler 3.x installed. Check lock file:

```bash
node -e "const l=require('./package-lock.json'); const k=Object.keys(l.packages).filter(k=>k.includes('gesture')); k.forEach(k=>console.log(k,l.packages[k].version))"
```

Fix: remove the entry from `package-lock.json` and run `npm install`.

### `androidx.core:core:1.16.0` requires compileSdk 35

Caused by gesture-handler 3.x pulling in a newer `androidx.core`. Fixing the gesture-handler version (above) also resolves this.

### `No project environment variables` warning in EAS

The build will succeed but `EXPO_PUBLIC_API_URL` will be undefined at runtime. Add the variable in the Expo dashboard (see Environment variables section above).

### TypeScript error: `View cannot be used as a JSX component`

Root cause: two different `React.Component` type declarations in node_modules (one from `@types/react` at root, one at a nested path).

Fix: ensure `@types/react: "~18.2.79"` is in root `package.json` devDependencies (already set) so all packages share the same declaration.

## CI Workflow (`mobile.yml`)

On push to `main`:
1. TypeScript type-check (`tsc --noEmit`)
2. EAS build (`eas build --platform android --profile preview --non-interactive`)

The `--non-interactive` flag is required for CI. The EAS build runs asynchronously on Expo's servers — the GitHub Actions job completes once the build is queued (not when it finishes). Check build status at [expo.dev/accounts/haneesh17/projects/bluemetal-pro/builds](https://expo.dev/accounts/haneesh17/projects/bluemetal-pro/builds).

## Monorepo Notes

The app lives in a npm workspaces monorepo. The `eas-build-pre-install` script in `apps/mobile/package.json` runs `npm install --ignore-scripts` from the repo root before the EAS build, so all workspace packages are available.

Metro is configured in `apps/mobile/metro.config.js` to watch the monorepo root and resolve modules from both `apps/mobile/node_modules` and the root `node_modules`.
