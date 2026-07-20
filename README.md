<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/icon/ont_logo_square_color_white_1024x1024.png">
    <img alt="Logo" src="assets/icon/ont_logo_square_color_back_1024x1024.png" width="128" />
  </picture>
  <h1 align="center">OpenNutriTracker</h1>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT" alt="License">
        <img src="https://img.shields.io/badge/license-GPLv3-blue" /></a>
</p>

## Description
OpenNutriTracker is a local-first web app for manually tracking calories, macros, meals, recipes, and weight. The active web product lives in [`docs/site`](docs/site), works responsively on desktop and mobile, and can be installed as a PWA. It does not connect to Apple Health or Apple Watch.

## Screenshots
<p align="center">
  <img alt="Logo" src="docs/site/screenshots/1_en-US.png" width="20%" />
  &nbsp;&nbsp;
  <img alt="Logo" src="docs/site/screenshots/2_en-US.png" width="20%" />
  &nbsp;&nbsp;
  <img alt="Logo" src="docs/site/screenshots/3_en-US.png" width="20%" />
  &nbsp;&nbsp;
  <img alt="Logo" src="docs/site/screenshots/4_en-US.png" width="20%" />
</p>

## Run the web app

Serve [`docs/site`](docs/site) with any static web server. For example:

```sh
python3 -m http.server 8080 --directory docs/site
```

Then open `http://localhost:8080`. The GitHub Pages workflow deploys the same directory.

## Key Features

- **🍎 Manual nutrition tracking:** Enter a name and calories, with optional protein, carbohydrates, and fat, and assign it to breakfast, lunch, dinner, or snacks.
- **🏋️ Training/rest targets:** Keep separate calorie and macro targets for training days and rest days, automatically rotate through a three-on/one-off schedule, and override today's type when plans change.
- **⚡ Fast logging:** Re-add deduplicated recent items, create reusable quick templates, or choose an item from the food search without retyping nutrition values.
- **🔎 Food search:** Includes an offline starter list and searches the Open Food Facts catalogue for packaged-food matches when online.
- **📓 Food diary:** See today's meals and a seven-day calorie trend, with delete controls for individual entries.
- **🍽️ Recipes:** Save reusable meal combinations and log them again with one click.
- **⚖️ Weight history:** Record weight by date and review the trend and history.
- **🎨 Appearance:** Follow the system appearance or choose light or dark mode.
- **🔢 kcal or kJ:** Switch the energy unit globally; every diary entry, target, and chart reflects the choice.
- **📤 Export and import:** Back up and restore the complete browser database as JSON.
- **🔒 Privacy first:** Personal nutrition data is stored in the current browser. Food-search text is sent to Open Food Facts only when online catalogue search is used.
- **🚫💰 No subscriptions, in-app purchases, or ads:** OpenNutriTracker is free, with no paid tier and no advertising.

## Privacy
See [Data Protection](https://www.iubenda.com/privacy-policy/53501884)
- **Browser-local storage**: Nutrition, recipe, template, and weight records remain in the current browser unless you explicitly export them.
- **Backups recommended**: Clearing browser site data can remove local records, so the app provides JSON export and import.
- **Open-Source**: OpenNutriTracker is an open-source application

### Legacy Flutter code

The repository still contains the earlier Flutter/iOS implementation for reference and migration work. [`GettingStarted.md`](GettingStarted.md) documents that legacy toolchain; new product work should target [`docs/site`](docs/site).

The data export bundle (Settings → Export / Import App Data → Export) is
documented at [`docs/export-format.md`](docs/export-format.md) — both the
JSON schema and the CSV companion the import / export round-trip uses.

Self-hosting the Supabase FDC database for local development is documented at [`docs/supabase-fdc-self-hosting.md`](docs/supabase-fdc-self-hosting.md).

## Disclaimer
OpenNutriTracker is not a medical application. All data provided is not validated and should be used with caution. Please maintain a healthy lifestyle and consult a professional if you have any problems. Use during illness, pregnancy or lactation is not recommended.

The application is still under construction. Errors, bugs and crashes might occur.

## Acknowledgments
The OpenNutriTracker project was inspired by the need for a simple and effective nutrition tracking tool.
The food database used in OpenNutriTracker is powered by [Open Food Facts](https://world.openfoodfacts.org/) and [Food Data Central](https://fdc.nal.usda.gov/). A curated subset of FDC is hosted in Supabase to keep search responsive on slow connections; the schema and refresh process are documented in [`docs/supabase-fdc-self-hosting.md`](docs/supabase-fdc-self-hosting.md).

Dietary Reference Intake values for the micronutrient panel come from the U.S. National Academies' Institute of Medicine tables. The in-app **Sources & References** screen lists the peer-reviewed sources used for energy needs, BMI classification, macro distribution, and non-binary calorie estimation.

## License
This project is licensed under the GNU General Public License v3.0 License. See the [LICENSE](LICENSE) file for more information.
