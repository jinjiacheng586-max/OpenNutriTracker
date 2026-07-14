# Getting started on macOS

OpenNutriTracker is an iOS-only Flutter application. Local development requires:

- macOS with the full Xcode application and an iOS Simulator runtime
- CocoaPods
- FVM, which installs the Flutter version pinned in `.fvmrc`
- VS Code with the Flutter extension, or another Flutter-aware editor

## Install the Apple toolchain

Install Xcode from the Mac App Store, open it once, and install an iOS Simulator runtime from Xcode Settings → Platforms.

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
brew install cocoapods
```

## Install Flutter through FVM

```sh
brew tap leoafarias/fvm
brew install fvm
fvm install
```

The last command reads `.fvmrc`, installs the pinned Flutter SDK, and creates `.fvm/flutter_sdk`. VS Code uses that SDK through `.vscode/settings.json`.

## Prepare the project

Run these commands from the repository root:

```sh
cp .env.example .env
fvm flutter pub get
fvm dart run build_runner build
fvm flutter doctor -v
```

The placeholder environment values are enough for code generation and a basic debug build. Configure real Supabase values if you need the hosted FDC search; see `docs/supabase-fdc-self-hosting.md`.

## Run on an iOS Simulator

```sh
open -a Simulator
fvm flutter devices
fvm flutter run --flavor develop
```

If more than one simulator is available, pass its device ID with `-d`. If CocoaPods reports a stale or missing sandbox, run `pod install` in the `ios` directory and try again.

The `develop` scheme uses a separate bundle identifier and display name so it can coexist with an App Store build. Physical-device deployment requires an Apple Development team and code-signing configuration in Xcode.

## Test the Apple Health integration

The Apple Health connection is read-only. It requests access to active energy,
resting energy, and workouts; it never requests permission to save HealthKit
data.

Before signing a physical-device build, enable **HealthKit** and **Background
Delivery** for both App IDs in the Apple Developer portal:

- `com.opennutritracker.ont.opennutritracker`
- `com.opennutritracker.ont.opennutritracker.develop`

Regenerate the affected development and distribution provisioning profiles
after enabling the capability. The repository already contains the matching
entitlements and Xcode capability configuration.

Use a real iPhone, optionally paired with an Apple Watch. HealthKit background
delivery isn't supported by the Simulator. In the app, tap **Connect Apple
Health**, grant the three read permissions, then record a workout or allow the
Watch to sync one. The card refreshes when HealthKit reports a change and every
time the app returns to the foreground. iOS can coalesce background deliveries,
so updates are near-real-time rather than guaranteed second-by-second.
