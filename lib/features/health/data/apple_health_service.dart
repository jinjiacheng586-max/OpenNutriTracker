import 'package:flutter/services.dart';
import 'package:opennutritracker/features/health/domain/apple_health_summary.dart';

class AppleHealthService {
  static const _methodChannel = MethodChannel('com.opennutritracker/health');
  static const _eventChannel = EventChannel(
    'com.opennutritracker/health_updates',
  );

  const AppleHealthService();

  Future<AppleHealthStatus> getStatus() async {
    final value = await _methodChannel.invokeMapMethod<Object?, Object?>(
      'getStatus',
    );
    return AppleHealthStatus.fromMap(value ?? const {});
  }

  Future<AppleHealthSummary?> requestAuthorization() async {
    final value = await _methodChannel.invokeMapMethod<Object?, Object?>(
      'requestAuthorization',
    );
    if (value == null || value['updatedAtMillis'] == null) return null;
    return AppleHealthSummary.fromMap(value);
  }

  Future<AppleHealthSummary> getTodaySummary() async {
    final value = await _methodChannel.invokeMapMethod<Object?, Object?>(
      'getTodaySummary',
    );
    return AppleHealthSummary.fromMap(value ?? const {});
  }

  Stream<AppleHealthSummary> watchTodaySummary() {
    return _eventChannel.receiveBroadcastStream().map((event) {
      return AppleHealthSummary.fromMap(
        Map<Object?, Object?>.from(event as Map<Object?, Object?>),
      );
    });
  }
}
