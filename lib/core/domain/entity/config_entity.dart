import 'package:equatable/equatable.dart';
import 'package:opennutritracker/core/data/dbo/config_dbo.dart';
import 'package:opennutritracker/core/domain/entity/app_theme_entity.dart';

class ConfigEntity extends Equatable {
  final bool hasAcceptedDisclaimer;
  final bool hasAcceptedPolicy;

  // Kept only so older Hive records and exported backups remain readable.
  // The iOS app no longer collects or sends anonymous diagnostic data.
  final bool hasAcceptedSendAnonymousData;

  final AppThemeEntity appTheme;
  final bool usesImperialUnits;
  final double? userKcalAdjustment;
  final double? userCarbGoalPct;
  final double? userProteinGoalPct;
  final double? userFatGoalPct;
  final bool showMealMacros;
  final bool notificationsEnabled;
  final int notificationHour;
  final int notificationMinute;
  final String? selectedLocale;
  final bool showMicronutrients;
  final bool usesKilojoules;
  final Map<String, int>? diarySortPreferences;
  final int dayStartOffsetHours;
  final int dayStartOffsetMinutes;

  const ConfigEntity(
    this.hasAcceptedDisclaimer,
    this.hasAcceptedPolicy,
    this.hasAcceptedSendAnonymousData,
    this.appTheme, {
    this.usesImperialUnits = false,
    this.userKcalAdjustment,
    this.userCarbGoalPct,
    this.userProteinGoalPct,
    this.userFatGoalPct,
    this.showMealMacros = true,
    this.notificationsEnabled = false,
    this.notificationHour = 8,
    this.notificationMinute = 0,
    this.selectedLocale,
    this.showMicronutrients = false,
    this.usesKilojoules = false,
    this.diarySortPreferences,
    this.dayStartOffsetHours = 0,
    this.dayStartOffsetMinutes = 0,
  });

  int get dayStartOffsetTotalMinutes =>
      dayStartOffsetHours * 60 + dayStartOffsetMinutes;

  factory ConfigEntity.fromConfigDBO(ConfigDBO dbo) => ConfigEntity(
        dbo.hasAcceptedDisclaimer,
        dbo.hasAcceptedPolicy,
        dbo.hasAcceptedSendAnonymousData,
        AppThemeEntity.fromAppThemeDBO(dbo.selectedAppTheme),
        usesImperialUnits: dbo.usesImperialUnits ?? false,
        userKcalAdjustment: dbo.userKcalAdjustment,
        userCarbGoalPct: dbo.userCarbGoalPct,
        userProteinGoalPct: dbo.userProteinGoalPct,
        userFatGoalPct: dbo.userFatGoalPct,
        showMealMacros: dbo.showMealMacros ?? true,
        notificationsEnabled: dbo.notificationsEnabled ?? false,
        notificationHour: dbo.notificationHour ?? 8,
        notificationMinute: dbo.notificationMinute ?? 0,
        selectedLocale: _supportedLocale(dbo.selectedLocale),
        showMicronutrients: dbo.showMicronutrients ?? false,
        usesKilojoules: dbo.usesKilojoules ?? false,
        diarySortPreferences: dbo.diarySortPreferences,
        dayStartOffsetHours: _normaliseOffsetHours(dbo.dayStartOffsetHours),
        dayStartOffsetMinutes:
            _normaliseOffsetMinutes(dbo.dayStartOffsetMinutes),
      );

  static String? _supportedLocale(String? locale) {
    if (locale == null || locale == 'en' || locale == 'zh') return locale;
    return null;
  }

  static int _normaliseOffsetHours(int? raw) {
    if (raw == null || raw < 0 || raw > 23) return 0;
    return raw;
  }

  static int _normaliseOffsetMinutes(int? raw) {
    if (raw == null || raw < 0) return 0;
    if (raw > 59) return 59;
    return raw;
  }

  @override
  List<Object?> get props => [
        hasAcceptedDisclaimer,
        hasAcceptedPolicy,
        appTheme,
        usesImperialUnits,
        userKcalAdjustment,
        userCarbGoalPct,
        userProteinGoalPct,
        userFatGoalPct,
        showMealMacros,
        notificationsEnabled,
        notificationHour,
        notificationMinute,
        selectedLocale,
        showMicronutrients,
        usesKilojoules,
        diarySortPreferences,
        dayStartOffsetHours,
        dayStartOffsetMinutes,
      ];
}
