import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('every iOS app configuration signs with the HealthKit entitlements', () {
    final project = File(
      'ios/Runner.xcodeproj/project.pbxproj',
    ).readAsStringSync();
    final entitlementAssignments = RegExp(
      r'CODE_SIGN_ENTITLEMENTS = Runner/Runner\.entitlements;',
    ).allMatches(project);

    expect(
      entitlementAssignments.length,
      6,
      reason: 'full and develop each have Debug, Release, and Profile builds',
    );
    expect(project, contains('com.apple.HealthKit = {'));
    expect(project, contains('com.apple.HealthKit.BackgroundDelivery = {'));
  });

  test(
    'native bridge requests the Apple Watch activity types shown in app',
    () {
      final plugin = File(
        'ios/Runner/AppleHealthPlugin.swift',
      ).readAsStringSync();
      final infoPlist = File('ios/Runner/Info.plist').readAsStringSync();

      expect(plugin, contains('forIdentifier: .activeEnergyBurned'));
      expect(plugin, contains('forIdentifier: .basalEnergyBurned'));
      expect(plugin, contains('HKObjectType.workoutType()'));
      expect(infoPlist, contains('<key>NSHealthShareUsageDescription</key>'));
      expect(infoPlist, contains('Apple Watch active energy'));
    },
  );
}
