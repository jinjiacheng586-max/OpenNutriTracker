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
