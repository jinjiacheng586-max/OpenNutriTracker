# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenNutriTracker is an iOS-only Flutter app for nutritional tracking. It uses Open Food Facts and USDA Food Data Central (via Supabase) as food databases, with all user data stored locally in an AES-encrypted Hive database.

Flutter version: **3.41.7** (managed via FVM; see `.fvmrc`)

## Commands

All common tasks are in the `justfile`:

```sh
just install       # flutter pub get
just build         # dart run build_runner build --delete-conflicting-outputs
just format        # dart format ./lib/core ./lib/features ./lib/l10n ./test
just test          # flutter test
just check_intl    # verify generated intl files are up to date (used in CI)
just ci            # full CI: install, format check, intl check, build, analyze, test
```

Run a single test file:

```sh
flutter test test/unit_test/tdee_calc_test.dart
```

Run static analysis:

```sh
flutter analyze
```

## Environment Setup

Copy `.env.example` to `.env` and fill in real values before running:

```sh
cp .env.example .env
```

The template carries placeholders that have no real-world effect — they exist so `envied`'s codegen finds every key on a fresh clone. Replace them:

```
FDC_API_KEY="YOUR_KEY"        # USDA Food Data Central API key (direct FDC source, not actively used in UI)
SUPABASE_PROJECT_URL="PROJECT_URL"
SUPABASE_PROJECT_ANON_KEY="ANON_KEY"
```

`.env` is gitignored (`.gitignore` matches `*.env`), so your real secrets won't be committed accidentally. After editing it, run `just build` to regenerate `lib/core/utils/env.g.dart` (also gitignored). The `envied` package obfuscates all secret values at compile time.

## Code Generation

Run `just build` (i.e. `dart run build_runner build`) whenever you add or modify any of the source files listed below. Every generated file starts with `// GENERATED CODE - DO NOT MODIFY BY HAND` or an equivalent header — never edit them directly.

If `build_runner` fails with `PackageNotFoundException: hive` after pulling from an older checkout, the build cache is stale from the pre-`hive_ce` days. Fix it with:

```sh
rm -rf .dart_tool/build
dart run build_runner build
```

### What gets generated and when

| Trigger                            | Generated file(s)                                                                                         | Tool                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------- |
| Any `@HiveType` / `@HiveField` DBO | `<dbo_file>.g.dart` alongside the source                                                                  | `hive_ce_generator` |
| Any new DBO added anywhere         | `lib/hive_registrar.g.dart` — the `HiveRegistrar` extension that calls `registerAdapter()` for every type | `hive_ce_generator` |
| Any `@JsonSerializable` DTO        | `<dto_file>.g.dart` alongside the source                                                                  | `json_serializable` |
| `.env` file edited                 | `lib/core/utils/env.g.dart` (**gitignored** — must regenerate after every clone)                          | `envied_generator`  |

**DBO files** live in `lib/core/data/dbo/` and `lib/core/data/data_source/` (one `.g.dart` per file). Whenever you add a `@HiveField` or change a field's type, regenerate — otherwise the binary reader/writer will be out of sync.

**`lib/hive_registrar.g.dart`** is checked in to version control (it has no machine-specific content). Regenerate it any time you add or remove a DBO type. The `HiveDBProvider` registers adapters by calling `Hive.registerAdapters()` which delegates to this file.

**DTO files** live under `lib/features/add_meal/data/dto/` (OFF, FDC, and Supabase FDC subfolders). Regenerate when you add or change API response fields.

**`lib/core/utils/env.g.dart`** is the only generated file that is gitignored. After a fresh clone, run `just build` with a valid `.env` file before the app will compile.

## Localization

Source strings live in `lib/l10n/intl_en.arb` (and locale ARBs for `de`, `cs`, `it`, `pl`, `sk`, `tr`, `uk`, `zh`). Generated Dart files live in `lib/generated/intl/` and `lib/generated/l10n.dart`.

The generated files in `lib/generated/` are **manually maintained** — do not regenerate them with `intl_translation:generate_from_arb`, as the generator output conflicts with the project's 120-char formatting. Edit them directly when adding strings, then run `just check_intl` to verify CI passes.

Note: `SupportedLanguage` enum (used internally for Supabase FDC column selection) only handles `en` and `de`; all other locales fall back to English.

## Code Style

The project uses a **120-character line width** (configured in `analysis_options.yaml`). The `just format` command targets only `./lib/core ./lib/features ./lib/l10n ./test` — it deliberately excludes `lib/generated/`. Do not run `dart format` on `lib/generated/` files.

## Accessibility identifiers for interactive widgets

Every new interactive widget should use a stable `Semantics(identifier: 'kebab-case-id')` wrapper. On iOS the identifier maps to `accessibilityIdentifier`, allowing XCUITest and Appium to locate controls without depending on translated labels.

Keep identifiers locale-independent and avoid adding duplicate semantic roles when the child widget already provides one.

## Architecture

The project follows **Clean Architecture** with a feature-based module structure.

### App startup sequence

`main()` → `initLocator()` → Hive DB init (AES key from `flutter_secure_storage`) → Supabase init → check `UserDataSource.hasUserData()` → route to `onboarding` (first run) or `main` (returning user).

### Directory structure

```
lib/
  core/           # Shared across all features
    data/
      data_source/  # Hive box wrappers (local DB access)
      dbo/          # Hive-annotated database objects (suffixed DBO)
      repository/   # Core repositories (user, intake, config, etc.)
    domain/
      entity/       # Plain domain models (suffixed Entity)
      usecase/      # Business logic operations
    presentation/
      main_screen.dart  # Bottom nav shell (Home / Diary / Profile)
      widgets/          # Shared UI components
    styles/       # Color schemes, typography
    utils/        # locator.dart (DI), hive_db_provider.dart, env.dart, calc/, etc.
  features/       # One folder per screen/flow
    home/         # Dashboard with daily kcal/macro summary and meal lists
    diary/        # Calendar-based food diary, micronutrient panel, sort controls
    profile/      # User stats, BMI, goals, weight history chart
    add_meal/     # Food search (text + barcode) and meal logging
    meal_detail/  # Nutritional detail view for a food item, with daily kcal banner
    edit_meal/    # Edit a logged intake entry, custom meal create / template
    scanner/      # Barcode camera scanner (with manual entry fallback)
    recipes/      # Reusable recipes with photo, brand, ingredient picker
    settings/     # App settings, data export/import, day-start, theme picker
    onboarding/   # First-run user setup flow
  generated/      # Intl files — maintained manually (see Localization above)
  l10n/           # Source ARB translation files
```

Each feature follows the same three-layer structure:

- `data/` — DTOs and remote/local data sources
- `domain/` — feature-specific entities and use cases
- `presentation/` — BLoC + screen widgets

### Navigation

Named routes are defined in `NavigationOptions` and registered in `main.dart`. The three main tabs (Home / Diary / Profile) share a single `MainScreen` shell with `NavigationBar`; all other screens are pushed onto the route stack.

### State management

**flutter_bloc** is used throughout. Every screen has a corresponding `*Bloc` with `*Event` and `*State` files.

### Dependency injection

**GetIt** is the service locator. All registrations happen in `lib/core/utils/locator.dart` (`initLocator()`), called once at startup. Registration order matters — data sources first, then repositories, then use cases, then BLoCs.

- **`registerLazySingleton`** — screen-persistent BLoCs (Home, Diary, CalendarDay, Profile, Settings, Onboarding). `HomeBloc` and `DiaryBloc` cross-reference each other via the locator at runtime.
- **`registerFactory`** — per-navigation BLoCs (MealDetail, Scanner, EditMeal, AddMeal, Products, Food, Activities, ActivityDetail, ExportImport). A fresh instance is created each navigation.

### Local database

**hive_ce** (the actively maintained community fork of Hive) is used for all persistent local storage, AES-256 encrypted. The boxes opened by `HiveDBProvider`:

| Box                            | DBO type / payload          | Purpose                                                              |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------- |
| `ConfigBox`                    | `ConfigDBO`                 | App settings: theme, units, kcal adjustment, per-macro % goals       |
| `IntakeBox`                    | `IntakeDBO`                 | Meal log entries (links to `MealDBO`, typed by `IntakeTypeDBO`)      |
| `UserBox`                      | `UserDBO`                   | User profile: height, weight, birthday, gender, PAL, goal            |
| `TrackedDayBox`                | `TrackedDayDBO`             | Per-day calorie/macro running totals for diary calendar              |
| `CustomMealBox`                | `MealDBO`                   | User-saved custom meals (search index for the food picker)           |
| `RecipeBox`                    | `RecipeDBO`                 | User-saved recipes with photo, brand, ingredients                    |
| `CachedOffMealBox`             | `MealDBO`                   | Open Food Facts response cache for offline / slow-connection use     |
| `CachedOffMealTimestampsBox`   | `int`                       | Cache freshness timestamps for the OFF cache                         |
| `WeightLogBox`                 | `WeightLogDBO`              | Weight history points for the profile trend chart                    |

When adding a new `@HiveType`, assign a unique `typeId`. Check all existing DBOs to avoid collisions — IDs are currently scattered across 0–30+.

### Food data sources

`ProductsRepository` aggregates three sources via `SearchProductsUseCase`:

| Source          | Class             | Notes                                                            |
| --------------- | ----------------- | ---------------------------------------------------------------- |
| Open Food Facts | `OFFDataSource`   | REST API — text search + barcode lookup                          |
| Supabase FDC    | `SpFdcDataSource` | Full-text search on `fdc_food` table; `en`/`de` column selection |
| USDA FDC direct | `FDCDataSource`   | Requires `FDC_API_KEY`; not actively surfaced in the UI          |

`SearchProductsUseCase.searchFDCFoodByString` uses the **Supabase** source, not the direct FDC API.

### Calorie and macro calculations

Calculation utilities live in `lib/core/utils/calc/`:

- **TDEE** — `TDEECalc.getTDEEKcalIOM2005()` (IOM 2005 gender-specific equation). A WHO 2001 formula exists but is unused.
- **Calorie goal** — TDEE + weight-goal adjustment (±500 kcal) + optional user kcal offset + today's burned activity kcal.
- **Macro defaults** — 60% carbs / 25% fat / 15% protein of total kcal goal. Per-macro overrides stored in `ConfigEntity`.
- **MET** — `MetCalc` converts MET × weight × hours to burned kcal for activities.

### Data export / import

Settings screen exports to a `.zip` that bundles intakes, activities, tracked days, and recipes in both JSON (canonical, re-importable) and CSV (flat, for spreadsheets) formats — see [`docs/export-format.md`](docs/export-format.md) for the full schema. Import accepts the same zip and merges its contents into the existing boxes. User profile data (height, weight, birthday, PAL, goal) is intentionally **not** included in the export. Settings → Import also supports a pasted JSON blob for ad-hoc meal imports.

## Naming Conventions

| Suffix                     | Meaning                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `DBO`                      | Database Object — Hive-annotated local storage model          |
| `DTO`                      | Data Transfer Object — JSON-deserialized API response model   |
| `Entity`                   | Domain model — plain Dart class used in business logic and UI |
| `Bloc` / `Event` / `State` | BLoC pattern state management files                           |
| `Usecase`                  | Single-responsibility business logic class                    |
| `Repository`               | Mediates between data sources and use cases                   |
| `DataSource`               | Direct access to one data store (Hive box or HTTP API)        |
