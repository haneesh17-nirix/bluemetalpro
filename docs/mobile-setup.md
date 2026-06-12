# Mobile App — Setup & Build Guide

React Native (Expo SDK 54) — Android + iOS via EAS Build.

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

SDK 54 uses React Native 0.81.5 and React 19.1.0. All Expo packages are pinned to their SDK 54 bundled versions.

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

## Native Patches

EAS build servers now use Gradle 8.8 / AGP 8.3+ which introduced two breaking changes in Expo SDK 51 libraries. Two patches are applied automatically by `eas-build-post-install` after EAS installs packages:

| Patch | File | Bug |
|-------|------|-----|
| `patches/expo-modules-core+3.0.30.patch` | `ExpoModulesCorePlugin.gradle:95` | `components.release` → `components.findByName("release")` — AGP 8.3+ removed named property access on `SoftwareComponentContainer` |

The patch is idempotent. `eas-build-post-install` runs after EAS installs fresh packages (so it isn't overwritten) and before `expo prebuild` / Gradle.

If you upgrade `expo-modules-core`, re-verify the patch applies cleanly with `npx patch-package --error-on-fail` and rename the patch file to match the new version.

## Build Troubleshooting

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

The app lives in a npm workspaces monorepo. Two EAS lifecycle hooks are defined in `apps/mobile/package.json`:

| Hook | When it runs | What it does |
|------|-------------|-------------|
| `eas-build-pre-install` | Before EAS installs packages | `npm install --ignore-scripts` from repo root — makes all workspace packages available |
| `eas-build-post-install` | After EAS installs packages | Applies `patch-package` patches (expo-modules-core AGP fix) |

Metro is configured in `apps/mobile/metro.config.js` to watch the monorepo root and resolve modules from both `apps/mobile/node_modules` and the root `node_modules`.
