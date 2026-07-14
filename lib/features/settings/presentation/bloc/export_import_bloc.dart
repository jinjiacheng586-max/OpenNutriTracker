import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:opennutritracker/features/settings/domain/usecase/export_data_usecase.dart';
import 'package:opennutritracker/features/settings/domain/usecase/import_data_usecase.dart';

part 'export_import_event.dart';

part 'export_import_state.dart';

class ExportImportBloc extends Bloc<ExportImportEvent, ExportImportState> {
  static const exportZipFileName = 'opennutritracker-export.zip';
  static const userIntakeJsonFileName = 'user_intake.json';
  static const trackedDayJsonFileName = 'user_tracked_day.json';
  static const recipeJsonFileName = 'user_recipes.json';
  static const weightLogJsonFileName = 'weight_log.json';

  final ExportDataUsecase _exportDataUsecase;
  final ImportDataUsecase _importDataUsecase;

  ExportImportBloc(
    this._exportDataUsecase,
    this._importDataUsecase,
  ) : super(ExportImportInitial()) {
    on<ExportDataEvent>((event, emit) async {
      try {
        emit(ExportImportLoadingState());

        final result = await _exportDataUsecase.exportData(
          exportZipFileName,
          userIntakeJsonFileName,
          trackedDayJsonFileName,
          recipeJsonFileName,
          weightLogJsonFileName,
          format: event.format,
        );

        if (result) {
          emit(ExportImportSuccess());
        } else {
          emit(ExportImportInitial());
        }
      } catch (e) {
        emit(ExportImportError());
      }
    });

    on<ImportDataEvent>((event, emit) async {
      try {
        emit(ExportImportLoadingState());

        final result = event.format == ExportFormat.csv
            ? await _importDataUsecase.importDataCsv()
            : await _importDataUsecase.importData(
                userIntakeJsonFileName,
                trackedDayJsonFileName,
                recipeJsonFileName,
                weightLogJsonFileName,
              );
        if (result) {
          emit(ExportImportSuccess());
        } else {
          emit(ExportImportInitial());
        }
      } catch (e) {
        emit(ExportImportError());
      }
    });


    on<ResetExportImportStateEvent>((event, emit) {
      emit(ExportImportInitial());
    });
  }
}
