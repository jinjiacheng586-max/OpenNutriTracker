part of 'export_import_bloc.dart';

abstract class ExportImportEvent extends Equatable {
  const ExportImportEvent();
}

class ExportDataEvent extends ExportImportEvent {
  /// Which format the user picked from the export dialog's segmented
  /// control. Defaults to JSON because that's the canonical backup-and-
  /// restore format the app re-imports from.
  final ExportFormat format;

  const ExportDataEvent({this.format = ExportFormat.json});

  @override
  List<Object?> get props => [format];
}

class ImportDataEvent extends ExportImportEvent {
  /// Which format the user picked from the export/import dialog's
  /// segmented control. Determines whether the import reads a JSON zip
  /// (canonical round-trip) or a CSV zip (one-way restore that does not
  /// include recipes — see [ExportDataUsecase] for the asymmetry).
  final ExportFormat format;

  const ImportDataEvent({this.format = ExportFormat.json});

  @override
  List<Object?> get props => [format];
}

/// Reset the bloc state — used when the Import dialog flips between CSV
/// and JSON segments so stale success/error chrome doesn't bleed across.
class ResetExportImportStateEvent extends ExportImportEvent {
  @override
  List<Object?> get props => [];
}
