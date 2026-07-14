class AppleHealthStatus {
  final bool available;
  final bool authorizationRequested;

  const AppleHealthStatus({
    required this.available,
    required this.authorizationRequested,
  });

  factory AppleHealthStatus.fromMap(Map<Object?, Object?> map) {
    return AppleHealthStatus(
      available: map['available'] == true,
      authorizationRequested: map['authorizationRequested'] == true,
    );
  }
}

class AppleHealthWorkout {
  final String id;
  final String activityType;
  final DateTime start;
  final DateTime end;
  final Duration duration;
  final double activeEnergyKcal;

  const AppleHealthWorkout({
    required this.id,
    required this.activityType,
    required this.start,
    required this.end,
    required this.duration,
    required this.activeEnergyKcal,
  });

  factory AppleHealthWorkout.fromMap(Map<Object?, Object?> map) {
    final startMillis = _asInt(map['startMillis']);
    final endMillis = _asInt(map['endMillis']);
    final durationSeconds = _asDouble(map['durationSeconds']);
    return AppleHealthWorkout(
      id: map['id']?.toString() ?? '',
      activityType: map['activityType']?.toString() ?? 'other',
      start: DateTime.fromMillisecondsSinceEpoch(startMillis),
      end: DateTime.fromMillisecondsSinceEpoch(endMillis),
      duration: Duration(milliseconds: (durationSeconds * 1000).round()),
      activeEnergyKcal: _asDouble(map['activeEnergyKcal']),
    );
  }
}

class AppleHealthSummary {
  final double activeEnergyKcal;
  final double basalEnergyKcal;
  final DateTime updatedAt;
  final List<AppleHealthWorkout> workouts;

  const AppleHealthSummary({
    required this.activeEnergyKcal,
    required this.basalEnergyKcal,
    required this.updatedAt,
    required this.workouts,
  });

  /// Total daily expenditure is resting energy plus active energy.
  ///
  /// Workout energy is deliberately not added here because HealthKit's active
  /// energy total already includes energy samples associated with workouts.
  double get totalEnergyKcal => activeEnergyKcal + basalEnergyKcal;

  factory AppleHealthSummary.fromMap(Map<Object?, Object?> map) {
    final rawWorkouts = map['workouts'];
    return AppleHealthSummary(
      activeEnergyKcal: _asDouble(map['activeEnergyKcal']),
      basalEnergyKcal: _asDouble(map['basalEnergyKcal']),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(
        _asInt(map['updatedAtMillis']),
      ),
      workouts: rawWorkouts is List
          ? rawWorkouts
                .whereType<Map<Object?, Object?>>()
                .map((workout) => AppleHealthWorkout.fromMap(workout))
                .toList(growable: false)
          : const [],
    );
  }
}

double _asDouble(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int _asInt(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
