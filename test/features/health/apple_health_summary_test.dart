import 'package:flutter_test/flutter_test.dart';
import 'package:opennutritracker/features/health/domain/apple_health_summary.dart';

void main() {
  test('total expenditure adds resting and active energy only', () {
    final summary = AppleHealthSummary.fromMap({
      'activeEnergyKcal': 500,
      'basalEnergyKcal': 1500,
      // A native total is intentionally ignored so the Dart definition stays
      // explicit and workout calories can never be double counted.
      'totalEnergyKcal': 9999,
      'updatedAtMillis': 1,
      'workouts': [
        {
          'id': 'run-1',
          'activityType': 'running',
          'startMillis': 1000,
          'endMillis': 2000,
          'durationSeconds': 1,
          'activeEnergyKcal': 300,
        },
      ],
    });

    expect(summary.totalEnergyKcal, 2000);
    expect(summary.activeEnergyKcal, 500);
    expect(summary.workouts.single.activeEnergyKcal, 300);
  });

  test('parses HealthKit workout details defensively', () {
    final summary = AppleHealthSummary.fromMap({
      'activeEnergyKcal': 245.5,
      'basalEnergyKcal': 811.25,
      'updatedAtMillis': 1720929600000,
      'workouts': [
        {
          'id': 'walk-1',
          'activityType': 'walking',
          'startMillis': 1720926000000,
          'endMillis': 1720927800000,
          'durationSeconds': 1800.0,
          'activeEnergyKcal': 94.2,
        },
      ],
    });

    final workout = summary.workouts.single;
    expect(workout.activityType, 'walking');
    expect(workout.duration, const Duration(minutes: 30));
    expect(workout.activeEnergyKcal, 94.2);
    expect(summary.totalEnergyKcal, 1056.75);
  });
}
