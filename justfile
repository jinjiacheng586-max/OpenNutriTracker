intl_output_dir := "./lib/generated/intl/"

# Install dependencies
install:
  flutter pub get

# Build OpenNutriTracker
build:
  dart run build_runner build

# Format dart code (excludes lib/generated/ — those files are auto-generated with their own style)
format *OPTIONS:
  dart format {{OPTIONS}} ./lib/core ./lib/features ./lib/l10n ./test

# Regenerate intl files
# Note: lib/generated/ files are maintained manually to avoid formatting churn from the generators
run_intl: format

# Check if intl files are correctly generated
check_intl:
  test -f {{intl_output_dir}}messages_en.dart
  test -f {{intl_output_dir}}messages_zh.dart
  test -f lib/l10n/intl_en.arb
  test -f lib/l10n/intl_zh.arb

# Run tests
test:
  flutter test

# Run CI checks
ci: install (format "--set-exit-if-changed") check_intl build && test
  flutter analyze

dev:
  fvm flutter run --flavor develop
