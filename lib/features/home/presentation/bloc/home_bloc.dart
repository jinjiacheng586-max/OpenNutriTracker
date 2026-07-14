import 'package:collection/collection.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:opennutritracker/core/domain/entity/calories_profile_entity.dart';
import 'package:opennutritracker/core/domain/entity/intake_entity.dart';
import 'package:opennutritracker/core/domain/entity/user_gender_entity.dart';
import 'package:opennutritracker/core/domain/usecase/add_config_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/add_tracked_day_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/delete_intake_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/get_config_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/get_intake_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/get_kcal_goal_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/get_macro_goal_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/get_user_usecase.dart';
import 'package:opennutritracker/core/domain/usecase/update_intake_usecase.dart';
import 'package:opennutritracker/core/utils/calc/calorie_goal_calc.dart';
import 'package:opennutritracker/core/utils/calc/day_boundary_calc.dart';
import 'package:opennutritracker/core/utils/locator.dart';
import 'package:opennutritracker/features/diary/presentation/bloc/calendar_day_bloc.dart';
import 'package:opennutritracker/features/diary/presentation/bloc/diary_bloc.dart';

part 'home_event.dart';

part 'home_state.dart';

class HomeBloc extends Bloc<HomeEvent, HomeState> {
  final GetConfigUsecase _getConfigUsecase;
  final AddConfigUsecase _addConfigUsecase;
  final GetIntakeUsecase _getIntakeUsecase;
  final DeleteIntakeUsecase _deleteIntakeUsecase;
  final UpdateIntakeUsecase _updateIntakeUsecase;
  final AddTrackedDayUsecase _addTrackedDayUseCase;
  final GetKcalGoalUsecase _getKcalGoalUsecase;
  final GetMacroGoalUsecase _getMacroGoalUsecase;
  final GetUserUsecase _getUserUsecase;

  DateTime currentDay = DateTime.now();

  HomeBloc(
    this._getConfigUsecase,
    this._addConfigUsecase,
    this._getIntakeUsecase,
    this._deleteIntakeUsecase,
    this._updateIntakeUsecase,
    this._addTrackedDayUseCase,
    this._getKcalGoalUsecase,
    this._getMacroGoalUsecase,
    this._getUserUsecase,
  ) : super(HomeInitial()) {
    on<LoadItemsEvent>((event, emit) async {
      emit(HomeLoadingState());

      final configData = await _getConfigUsecase.getConfig();
      final dayStartOffsetHours = configData.dayStartOffsetHours;
      final dayStartOffsetMinutes = configData.dayStartOffsetMinutes;
      // #139: the bloc's "current day" is the logical day, so day-change
      // detection on app resume respects the user's configured boundary.
      // The follow-up to #139 routes the boundary through total minutes
      // so a 04:30 setting is honoured exactly.
      currentDay = DayBoundaryCalc.currentLogicalDayMinutes(
        configData.dayStartOffsetTotalMinutes,
      );
      final usesImperialUnits = configData.usesImperialUnits;
      final showDisclaimerDialog = !configData.hasAcceptedDisclaimer;
      final showMealMacros = configData.showMealMacros;

      final breakfastIntakeList = await _getIntakeUsecase
          .getTodayBreakfastIntake(
            dayStartOffsetHours: dayStartOffsetHours,
            dayStartOffsetMinutes: dayStartOffsetMinutes,
          );
      final totalBreakfastKcal = getTotalKcal(breakfastIntakeList);
      final totalBreakfastCarbs = getTotalCarbs(breakfastIntakeList);
      final totalBreakfastFats = getTotalFats(breakfastIntakeList);
      final totalBreakfastProteins = getTotalProteins(breakfastIntakeList);

      final lunchIntakeList = await _getIntakeUsecase.getTodayLunchIntake(
        dayStartOffsetHours: dayStartOffsetHours,
        dayStartOffsetMinutes: dayStartOffsetMinutes,
      );
      final totalLunchKcal = getTotalKcal(lunchIntakeList);
      final totalLunchCarbs = getTotalCarbs(lunchIntakeList);
      final totalLunchFats = getTotalFats(lunchIntakeList);
      final totalLunchProteins = getTotalProteins(lunchIntakeList);

      final dinnerIntakeList = await _getIntakeUsecase.getTodayDinnerIntake(
        dayStartOffsetHours: dayStartOffsetHours,
        dayStartOffsetMinutes: dayStartOffsetMinutes,
      );
      final totalDinnerKcal = getTotalKcal(dinnerIntakeList);
      final totalDinnerCarbs = getTotalCarbs(dinnerIntakeList);
      final totalDinnerFats = getTotalFats(dinnerIntakeList);
      final totalDinnerProteins = getTotalProteins(dinnerIntakeList);

      final snackIntakeList = await _getIntakeUsecase.getTodaySnackIntake(
        dayStartOffsetHours: dayStartOffsetHours,
        dayStartOffsetMinutes: dayStartOffsetMinutes,
      );
      final totalSnackKcal = getTotalKcal(snackIntakeList);
      final totalSnackCarbs = getTotalCarbs(snackIntakeList);
      final totalSnackFats = getTotalFats(snackIntakeList);
      final totalSnackProteins = getTotalProteins(snackIntakeList);

      final totalKcalIntake =
          totalBreakfastKcal +
          totalLunchKcal +
          totalDinnerKcal +
          totalSnackKcal;
      final totalCarbsIntake =
          totalBreakfastCarbs +
          totalLunchCarbs +
          totalDinnerCarbs +
          totalSnackCarbs;
      final totalFatsIntake =
          totalBreakfastFats +
          totalLunchFats +
          totalDinnerFats +
          totalSnackFats;
      final totalProteinsIntake =
          totalBreakfastProteins +
          totalLunchProteins +
          totalDinnerProteins +
          totalSnackProteins;

      final user = await _getUserUsecase.getUserData();
      final totalKcalGoal = await _getKcalGoalUsecase.getKcalGoal(
        userEntity: user,
      );
      final totalCarbsGoal = await _getMacroGoalUsecase.getCarbsGoal(
        totalKcalGoal,
      );
      final totalFatsGoal = await _getMacroGoalUsecase.getFatsGoal(
        totalKcalGoal,
      );
      final totalProteinsGoal = await _getMacroGoalUsecase.getProteinsGoal(
        totalKcalGoal,
      );

      final totalKcalLeft = CalorieGoalCalc.getDailyKcalLeft(
        totalKcalGoal,
        totalKcalIntake,
      );

      emit(
        HomeLoadedState(
          showDisclaimerDialog: showDisclaimerDialog,
          totalKcalDaily: totalKcalGoal,
          totalKcalLeft: totalKcalLeft,
          totalKcalSupplied: totalKcalIntake,
          totalKcalBurned: 0,
          totalCarbsIntake: totalCarbsIntake,
          totalFatsIntake: totalFatsIntake,
          totalCarbsGoal: totalCarbsGoal,
          totalFatsGoal: totalFatsGoal,
          totalProteinsGoal: totalProteinsGoal,
          totalProteinsIntake: totalProteinsIntake,
          breakfastIntakeList: breakfastIntakeList,
          lunchIntakeList: lunchIntakeList,
          dinnerIntakeList: dinnerIntakeList,
          snackIntakeList: snackIntakeList,
          usesImperialUnits: usesImperialUnits,
          showMealMacros: showMealMacros,
          userWeightKg: user.weightKG,
          userGender: user.gender,
          userCaloriesProfile: user.caloriesProfile,
        ),
      );
    });
  }

  double getTotalKcal(List<IntakeEntity> intakeList) =>
      intakeList.map((intake) => intake.totalKcal).toList().sum;

  double getTotalCarbs(List<IntakeEntity> intakeList) =>
      intakeList.map((intake) => intake.totalCarbsGram).toList().sum;

  double getTotalFats(List<IntakeEntity> intakeList) =>
      intakeList.map((intake) => intake.totalFatsGram).toList().sum;

  double getTotalProteins(List<IntakeEntity> intakeList) =>
      intakeList.map((intake) => intake.totalProteinsGram).toList().sum;

  void saveConfigData(bool acceptedDisclaimer) async {
    _addConfigUsecase.setConfigDisclaimer(acceptedDisclaimer);
  }

  Future<void> updateIntakeItem(
    String intakeId,
    Map<String, dynamic> fields,
  ) async {
    final dateTime = await _currentLogicalDay();
    // Get old intake values
    final oldIntakeObject = await _getIntakeUsecase.getIntakeById(intakeId);
    if (oldIntakeObject == null) return;
    final newIntakeObject = await _updateIntakeUsecase.updateIntake(
      intakeId,
      fields,
    );
    if (newIntakeObject == null) return;
    if (oldIntakeObject.amount > newIntakeObject.amount) {
      // Amounts shrunk
      await _addTrackedDayUseCase.removeDayCaloriesTracked(
        dateTime,
        oldIntakeObject.totalKcal - newIntakeObject.totalKcal,
      );
      await _addTrackedDayUseCase.removeDayMacrosTracked(
        dateTime,
        carbsTracked:
            oldIntakeObject.totalCarbsGram - newIntakeObject.totalCarbsGram,
        fatTracked:
            oldIntakeObject.totalFatsGram - newIntakeObject.totalFatsGram,
        proteinTracked:
            oldIntakeObject.totalProteinsGram -
            newIntakeObject.totalProteinsGram,
      );
    } else if (newIntakeObject.amount > oldIntakeObject.amount) {
      // Amounts gained
      await _addTrackedDayUseCase.addDayCaloriesTracked(
        dateTime,
        newIntakeObject.totalKcal - oldIntakeObject.totalKcal,
      );
      await _addTrackedDayUseCase.addDayMacrosTracked(
        dateTime,
        carbsTracked:
            newIntakeObject.totalCarbsGram - oldIntakeObject.totalCarbsGram,
        fatTracked:
            newIntakeObject.totalFatsGram - oldIntakeObject.totalFatsGram,
        proteinTracked:
            newIntakeObject.totalProteinsGram -
            oldIntakeObject.totalProteinsGram,
      );
    }
    _updateDiaryPage(dateTime);
  }

  Future<void> deleteIntakeItem(IntakeEntity intakeEntity) async {
    final dateTime = await _currentLogicalDay();
    await _deleteIntakeUsecase.deleteIntake(intakeEntity);
    await _addTrackedDayUseCase.removeDayCaloriesTracked(
      dateTime,
      intakeEntity.totalKcal,
    );
    await _addTrackedDayUseCase.removeDayMacrosTracked(
      dateTime,
      carbsTracked: intakeEntity.totalCarbsGram,
      fatTracked: intakeEntity.totalFatsGram,
      proteinTracked: intakeEntity.totalProteinsGram,
    );

    _updateDiaryPage(dateTime);
  }

  Future<void> _updateDiaryPage(DateTime day) async {
    locator<DiaryBloc>().add(const LoadDiaryYearEvent());
    locator<CalendarDayBloc>().add(RefreshCalendarDayEvent());
  }

  /// #139: tracked-day deltas (calories, macros) must land on the
  /// user's logical "today" — for someone on a 04:30 boundary, a 02:00
  /// edit still updates yesterday's totals. We resolve the offset on
  /// each call so the most recent setting wins without needing the
  /// bloc to cache it explicitly. The follow-up to #139 reads the
  /// total-minutes value so the minute component (0-59) is honoured.
  Future<DateTime> _currentLogicalDay() async {
    final config = await _getConfigUsecase.getConfig();
    return DayBoundaryCalc.currentLogicalDayMinutes(
      config.dayStartOffsetTotalMinutes,
    );
  }
}
