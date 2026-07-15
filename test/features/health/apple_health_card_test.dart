import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:opennutritracker/core/utils/energy_unit_provider.dart';
import 'package:opennutritracker/features/health/data/apple_health_service.dart';
import 'package:opennutritracker/features/health/domain/apple_health_summary.dart';
import 'package:opennutritracker/features/health/presentation/apple_health_card.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('explains that the connection reads Apple Watch Fitness data', (
    tester,
  ) async {
    await tester.pumpWidget(
      ChangeNotifierProvider<EnergyUnitProvider>(
        create: (_) => EnergyUnitProvider(),
        child: const MaterialApp(
          locale: Locale('zh'),
          supportedLocales: [Locale('en'), Locale('zh')],
          localizationsDelegates: [
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          home: Scaffold(
            body: AppleHealthCard(service: _DisconnectedAppleHealthService()),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('连接 Apple Watch / 健身'), findsOneWidget);
    expect(find.text('读取手表记录的活动卡路里、总消耗和每次运动。'), findsOneWidget);
  });

  testWidgets('shows read-only daily energy and workout details', (
    tester,
  ) async {
    final summary = AppleHealthSummary(
      activeEnergyKcal: 500,
      basalEnergyKcal: 1500,
      updatedAt: DateTime(2026, 7, 14, 13, 30),
      workouts: [
        AppleHealthWorkout(
          id: 'run-1',
          activityType: 'running',
          start: DateTime(2026, 7, 14, 7, 0),
          end: DateTime(2026, 7, 14, 7, 30),
          duration: const Duration(minutes: 30),
          activeEnergyKcal: 300,
        ),
      ],
    );
    AppleHealthSummary? callbackSummary;

    await tester.pumpWidget(
      ChangeNotifierProvider<EnergyUnitProvider>(
        create: (_) => EnergyUnitProvider(),
        child: MaterialApp(
          locale: const Locale('zh'),
          supportedLocales: const [Locale('en'), Locale('zh')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          home: Scaffold(
            body: AppleHealthCard(
              service: _FakeAppleHealthService(summary),
              onSummaryChanged: (value) => callbackSummary = value,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Apple Watch · 今日活动'), findsOneWidget);
    expect(find.text('2000 kcal'), findsOneWidget);
    expect(find.text('1500 kcal'), findsOneWidget);
    expect(find.text('500 kcal'), findsOneWidget);
    expect(find.text('跑步'), findsOneWidget);
    expect(find.text('300 kcal'), findsOneWidget);
    expect(callbackSummary, same(summary));
  });
}

class _DisconnectedAppleHealthService extends AppleHealthService {
  const _DisconnectedAppleHealthService();

  @override
  Future<AppleHealthStatus> getStatus() async {
    return const AppleHealthStatus(
      available: true,
      authorizationRequested: false,
    );
  }
}

class _FakeAppleHealthService extends AppleHealthService {
  final AppleHealthSummary summary;

  const _FakeAppleHealthService(this.summary);

  @override
  Future<AppleHealthStatus> getStatus() async {
    return const AppleHealthStatus(
      available: true,
      authorizationRequested: true,
    );
  }

  @override
  Future<AppleHealthSummary> getTodaySummary() async => summary;

  @override
  Stream<AppleHealthSummary> watchTodaySummary() => const Stream.empty();
}
