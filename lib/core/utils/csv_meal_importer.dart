import 'package:opennutritracker/features/add_meal/domain/entity/meal_entity.dart';
import 'package:opennutritracker/features/add_meal/domain/entity/meal_nutriments_entity.dart';

/// Result of importing a CSV file. [meals] holds successfully parsed rows,
/// [errors] holds one entry per skipped row (with the 1-based row number
/// from the user's perspective and a short reason).
class CsvImportResult {
  final List<MealEntity> meals;
  final List<String> errors;

  const CsvImportResult({required this.meals, required this.errors});

  bool get isEmpty => meals.isEmpty && errors.isEmpty;
  bool get hasErrors => errors.isNotEmpty;
}

/// Header keys the importer recognizes (case-insensitive). Only [_kName]
/// and [_kKcal] are required; everything else is optional and defaults to
/// null when absent or blank.
class CsvMealImporter {
  static const _kName = 'name';
  static const _kBrands = 'brands';
  static const _kBarcode = 'barcode';
  static const _kKcal = 'kcal_per_100g';
  static const _kCarbs = 'carbs_per_100g';
  static const _kFat = 'fat_per_100g';
  static const _kProtein = 'protein_per_100g';
  static const _kSugars = 'sugars_per_100g';
  static const _kSatFat = 'saturated_fat_per_100g';
  static const _kFiber = 'fiber_per_100g';

  /// Column order in the sample CSV (also used by the column-name table in
  /// the UI / docs).
  static const orderedColumns = <String>[
    _kName,
    _kBrands,
    _kBarcode,
    _kKcal,
    _kCarbs,
    _kFat,
    _kProtein,
    _kSugars,
    _kSatFat,
    _kFiber,
  ];

  static const requiredColumns = <String>{_kName, _kKcal};

  /// Parse [csvContent]. Lines are split on `\r?\n`; blank lines are ignored.
  /// Fields are split on commas — quoted fields with embedded commas are
  /// supported via the same minimal handling used elsewhere in the project.
  /// Whitespace around field values is trimmed.
  static CsvImportResult parse(String csvContent) {
    final lines = csvContent
        .split(RegExp(r'\r?\n'))
        .where((l) => l.trim().isNotEmpty)
        .toList();

    if (lines.isEmpty) {
      return const CsvImportResult(
        meals: [],
        errors: ['CSV file is empty'],
      );
    }

    final headerCells = _splitRow(lines.first)
        .map((c) => c.trim().toLowerCase())
        .toList();
    final missingRequired = requiredColumns
        .where((req) => !headerCells.contains(req))
        .toList();
    if (missingRequired.isNotEmpty) {
      return CsvImportResult(
        meals: const [],
        errors: ['Header is missing required column(s): ${missingRequired.join(', ')}'],
      );
    }

    final meals = <MealEntity>[];
    final errors = <String>[];

    for (var i = 1; i < lines.length; i++) {
      final rowNum = i + 1; // 1-based, including the header
      final cells = _splitRow(lines[i]);
      if (cells.length < headerCells.length) {
        errors.add('Row $rowNum: too few columns');
        continue;
      }
      final row = <String, String>{};
      for (var j = 0; j < headerCells.length; j++) {
        row[headerCells[j]] = cells[j].trim();
      }

      final name = row[_kName] ?? '';
      if (name.isEmpty) {
        errors.add('Row $rowNum: name is empty');
        continue;
      }
      final kcalRaw = row[_kKcal];
      final kcal = _parseNumOrNull(kcalRaw);
      if (kcal == null) {
        errors.add('Row $rowNum: kcal_per_100g is not a number');
        continue;
      }

      meals.add(
        MealEntity(
          // Leave the code null when no barcode was supplied so
          // CustomMealDataSource.saveCustomMeal dedupes by name on
          // re-import. With a barcode set, dedup happens by barcode.
          code: row[_kBarcode]?.isNotEmpty == true ? row[_kBarcode] : null,
          name: name,
          brands: row[_kBrands]?.isNotEmpty == true ? row[_kBrands] : null,
          url: null,
          mealQuantity: '100',
          mealUnit: 'g',
          servingQuantity: null,
          servingUnit: 'g',
          servingSize: '100 g',
          nutriments: MealNutrimentsEntity(
            energyKcal100: kcal,
            carbohydrates100: _parseNumOrNull(row[_kCarbs]),
            fat100: _parseNumOrNull(row[_kFat]),
            proteins100: _parseNumOrNull(row[_kProtein]),
            sugars100: _parseNumOrNull(row[_kSugars]),
            saturatedFat100: _parseNumOrNull(row[_kSatFat]),
            fiber100: _parseNumOrNull(row[_kFiber]),
          ),
          source: MealSourceEntity.custom,
        ),
      );
    }

    return CsvImportResult(meals: meals, errors: errors);
  }

  /// Sample CSV text shipped with the app. Includes the header row plus a
  /// couple of plausible rows so the user can see the expected shape.
  static String sampleCsv() {
    final header = orderedColumns.join(',');
    return '$header\n'
        'Banana,,,89,22.8,0.3,1.1,12.2,0.1,2.6\n'
        'Whole Milk 3.25%,Acme Dairy,1234567890123,61,4.8,3.3,3.2,5.1,1.9,0\n';
  }

  /// Split a single CSV row into cells. Handles double-quoted fields
  /// (with `""` as the escape for an embedded quote), which is enough for
  /// the food-label use case.
  static List<String> _splitRow(String line) {
    final cells = <String>[];
    final buf = StringBuffer();
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
      final ch = line[i];
      if (ch == '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
          buf.write('"');
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch == ',' && !inQuotes) {
        cells.add(buf.toString());
        buf.clear();
      } else {
        buf.write(ch);
      }
    }
    cells.add(buf.toString());
    return cells;
  }

  static double? _parseNumOrNull(String? raw) {
    if (raw == null) return null;
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    return double.tryParse(trimmed.replaceAll(',', '.'));
  }
}
