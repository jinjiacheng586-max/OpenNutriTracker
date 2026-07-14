part of 'calendar_day_bloc.dart';

abstract class CalendarDayState extends Equatable {
  const CalendarDayState();
}

class CalendarDayInitial extends CalendarDayState {
  @override
  List<Object> get props => [];
}

class CalendarDayLoading extends CalendarDayState {
  @override
  List<Object?> get props => [];
}

class CalendarDayLoaded extends CalendarDayState {
  final TrackedDayEntity? trackedDayEntity;
  final List<IntakeEntity> breakfastIntakeList;
  final List<IntakeEntity> lunchIntakeList;
  final List<IntakeEntity> dinnerIntakeList;
  final List<IntakeEntity> snackIntakeList;
  // #150: per-meal recommended kcal targets for this calendar day.
  // 0 means no daily goal exists for this day, in which case the diary
  // view simply omits the target portion of the section header.
  final double breakfastKcalTarget;
  final double lunchKcalTarget;
  final double dinnerKcalTarget;
  final double snackKcalTarget;
  // Persisted per-meal sort preference, keyed by meal type string
  // (breakfast / lunch / dinner / snack) and valued by DiarySortType index.
  // Null when the user has never picked a sort, in which case the diary
  // falls back to DiarySortType.timeAdded.
  final Map<String, int>? diarySortPreferences;

  const CalendarDayLoaded(
    this.trackedDayEntity,
    this.breakfastIntakeList,
    this.lunchIntakeList,
    this.dinnerIntakeList,
    this.snackIntakeList,
    this.breakfastKcalTarget,
    this.lunchKcalTarget,
    this.dinnerKcalTarget,
    this.snackKcalTarget, {
    this.diarySortPreferences,
  });

  @override
  List<Object?> get props => [
        trackedDayEntity,
        breakfastKcalTarget,
        lunchKcalTarget,
        dinnerKcalTarget,
        snackKcalTarget,
        diarySortPreferences,
      ];
}
