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
OpenNutriTracker is an open-source mobile application designed to simplify nutritional tracking and management. Whether you are looking to improve your health, lose weight, or simply maintain a balanced diet, OpenNutriTracker provides a minimalistic interface to easily track and analyze your daily nutrition.

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

## Install
[<img src="docs/site/screenshots/appstore_banner.png" width="30%">](https://apps.apple.com/us/app/opennutritracker/id6451490901)

## Key Features

- **🍎 Nutritional tracking:** Log meals and snacks against a large food database (Open Food Facts plus a curated subset of USDA FDC). Each entry can be searched, scanned, or added straight as a number when you already know the calorie cost.
- **📓 Food diary:** A calendar-driven diary that breaks the day into Breakfast, Lunch, Dinner, and Snack, with drag-to-rearrange between meals and sorting by time or macro contribution.
- **🥕 Micronutrient panel:** Day and week views for fibre, sodium, saturated fat, sugar, calcium, iron, potassium, vitamin D, vitamin B12, and magnesium, with optional Dietary Reference Intake bars from the IOM tables so you can see where you sit against the reference range.
- **🍽️ Custom meals + recipes:** Build a one-off custom meal or save a reusable recipe with photo, brand, and barcode. The recipe builder has its own ingredient picker with barcode scanning so you can compose meals from real products without leaving the screen.
- **⚡ Quick add:** When you already know roughly how much you ate, skip the search flow entirely — Quick add takes a title plus kcal (and optional macros) and logs it straight to the meal section.
- **📷 Barcode scanner:** Scan packaged items for instant lookup, paste a barcode manually when the camera struggles, or attach a barcode to a custom meal so future scans recognise your own foods.
- **⚖️ Weight history:** Capture weight during onboarding and on demand, see the trend on a chart with a dashed line at your target weight, and optionally taper the calorie goal as you approach it.
- **🎨 Appearance:** Follow the iOS system appearance or choose light or dark mode.
- **🔢 kcal or kJ:** Switch the energy unit globally; every diary entry, target, and chart reflects the choice.
- **📤 Export and import:** Back up and restore your diary, recipes, and weight history as a JSON zip, or export diary data as CSV.
- **🔒 Privacy first:** Personal nutrition data is stored locally on the device and no anonymous diagnostics are sent.
- **🚫💰 No subscriptions, in-app purchases, or ads:** OpenNutriTracker is free, with no paid tier and no advertising.

## Privacy
See [Data Protection](https://www.iubenda.com/privacy-policy/53501884)
- **Data Encryption**: All collected user data is encrypted and stored locally on your device
- **Local-first storage**: Nutrition, recipe, and weight records remain on your device unless you explicitly export them.
- **Open-Source**: OpenNutriTracker is an open-source application

### Getting Started With Development
See the [Getting Started](GettingStarted.md) file for more information.

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
