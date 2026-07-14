import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:opennutritracker/core/utils/calc/unit_calc.dart';
import 'package:opennutritracker/core/utils/energy_unit_provider.dart';
import 'package:opennutritracker/features/health/data/apple_health_service.dart';
import 'package:opennutritracker/features/health/domain/apple_health_summary.dart';
import 'package:provider/provider.dart';

class AppleHealthCard extends StatefulWidget {
  final AppleHealthService service;
  final ValueChanged<AppleHealthSummary>? onSummaryChanged;

  const AppleHealthCard({
    super.key,
    this.service = const AppleHealthService(),
    this.onSummaryChanged,
  });

  @override
  State<AppleHealthCard> createState() => _AppleHealthCardState();
}

class _AppleHealthCardState extends State<AppleHealthCard>
    with WidgetsBindingObserver {
  StreamSubscription<AppleHealthSummary>? _subscription;
  AppleHealthStatus? _status;
  AppleHealthSummary? _summary;
  bool _loading = true;
  bool _authorizing = false;
  bool _pluginAvailable = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_initialize());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_subscription?.cancel());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _status?.authorizationRequested == true) {
      unawaited(_refresh());
    }
  }

  Future<void> _initialize() async {
    try {
      final status = await widget.service.getStatus();
      if (!mounted) return;
      setState(() {
        _status = status;
        _loading = false;
      });
      if (!status.available) return;
      _subscription = widget.service.watchTodaySummary().listen(
        _acceptSummary,
        onError: (Object error) {
          if (mounted) setState(() => _error = error);
        },
      );
      if (status.authorizationRequested) await _refresh();
    } on MissingPluginException {
      if (mounted) {
        setState(() {
          _pluginAvailable = false;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _loading = false;
        });
      }
    }
  }

  Future<void> _requestAuthorization() async {
    setState(() {
      _authorizing = true;
      _error = null;
    });
    try {
      final summary = await widget.service.requestAuthorization();
      final status = await widget.service.getStatus();
      if (!mounted) return;
      setState(() {
        _status = status;
        _authorizing = false;
      });
      if (summary != null) _acceptSummary(summary);
      if (_subscription == null) {
        _subscription = widget.service.watchTodaySummary().listen(
          _acceptSummary,
          onError: (Object error) {
            if (mounted) setState(() => _error = error);
          },
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _authorizing = false;
        });
      }
    }
  }

  Future<void> _refresh() async {
    try {
      _acceptSummary(await widget.service.getTodaySummary());
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  void _acceptSummary(AppleHealthSummary summary) {
    if (!mounted) return;
    setState(() {
      _summary = summary;
      _error = null;
    });
    widget.onSummaryChanged?.call(summary);
  }

  @override
  Widget build(BuildContext context) {
    if (!_pluginAvailable || (!_loading && _status?.available != true)) {
      return const SizedBox.shrink();
    }
    final copy = _HealthCopy.of(context);
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: Card(
          child: SizedBox(
            height: 92,
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
      );
    }
    if (_status?.authorizationRequested != true) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const _AppleHealthIcon(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        copy.connectTitle,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        copy.connectBody,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _authorizing ? null : _requestAuthorization,
                  child: _authorizing
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(copy.connectAction),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return _buildSummary(context, copy);
  }

  Widget _buildSummary(BuildContext context, _HealthCopy copy) {
    final summary = _summary;
    final usesKilojoules = context.watch<EnergyUnitProvider>().usesKilojoules;
    double display(double kcal) =>
        usesKilojoules ? UnitCalc.kcalToKj(kcal) : kcal;
    final unit = usesKilojoules ? 'kJ' : 'kcal';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const _AppleHealthIcon(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          copy.todayEnergy,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          summary == null
                              ? copy.waiting
                              : copy.updatedAt(
                                  TimeOfDay.fromDateTime(
                                    summary.updatedAt,
                                  ).format(context),
                                ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: copy.refresh,
                    onPressed: _refresh,
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  copy.readError,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _EnergyValue(
                      label: copy.totalBurned,
                      value: display(summary?.totalEnergyKcal ?? 0),
                      unit: unit,
                      emphasized: true,
                    ),
                  ),
                  Expanded(
                    child: _EnergyValue(
                      label: copy.restingEnergy,
                      value: display(summary?.basalEnergyKcal ?? 0),
                      unit: unit,
                    ),
                  ),
                  Expanded(
                    child: _EnergyValue(
                      label: copy.activeEnergy,
                      value: display(summary?.activeEnergyKcal ?? 0),
                      unit: unit,
                    ),
                  ),
                ],
              ),
              const Divider(height: 32),
              Text(
                copy.todayWorkouts,
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              if (summary == null || summary.workouts.isEmpty)
                Text(
                  copy.noWorkouts,
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                ...summary.workouts.map(
                  (workout) => _WorkoutRow(
                    workout: workout,
                    activityName: copy.activityName(workout.activityType),
                    energy: display(workout.activeEnergyKcal),
                    unit: unit,
                    durationLabel: copy.durationMinutes(
                      workout.duration.inMinutes,
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                copy.readOnlyFootnote,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppleHealthIcon extends StatelessWidget {
  const _AppleHealthIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.favorite, color: Color(0xFFFF2D55)),
    );
  }
}

class _EnergyValue extends StatelessWidget {
  final String label;
  final double value;
  final String unit;
  final bool emphasized;

  const _EnergyValue({
    required this.label,
    required this.value,
    required this.unit,
    this.emphasized = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 3),
        Text(
          '${value.round()} $unit',
          style: emphasized
              ? Theme.of(context).textTheme.titleLarge
              : Theme.of(context).textTheme.titleSmall,
        ),
      ],
    );
  }
}

class _WorkoutRow extends StatelessWidget {
  final AppleHealthWorkout workout;
  final String activityName;
  final double energy;
  final String unit;
  final String durationLabel;

  const _WorkoutRow({
    required this.workout,
    required this.activityName,
    required this.energy,
    required this.unit,
    required this.durationLabel,
  });

  @override
  Widget build(BuildContext context) {
    final start = TimeOfDay.fromDateTime(workout.start).format(context);
    final end = TimeOfDay.fromDateTime(workout.end).format(context);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
        child: Icon(
          _activityIcon(workout.activityType),
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
      title: Text(activityName),
      subtitle: Text('$start–$end · $durationLabel'),
      trailing: Text('${energy.round()} $unit'),
    );
  }
}

IconData _activityIcon(String activityType) {
  return switch (activityType) {
    'walking' || 'hiking' => Icons.directions_walk,
    'running' => Icons.directions_run,
    'cycling' => Icons.directions_bike,
    'swimming' => Icons.pool,
    'yoga' || 'pilates' || 'flexibility' => Icons.self_improvement,
    'traditionalStrengthTraining' ||
    'functionalStrengthTraining' => Icons.fitness_center,
    _ => Icons.sports,
  };
}

class _HealthCopy {
  final bool zh;

  const _HealthCopy(this.zh);

  factory _HealthCopy.of(BuildContext context) =>
      _HealthCopy(Localizations.localeOf(context).languageCode == 'zh');

  String get connectTitle => zh ? '连接 Apple 健康' : 'Connect Apple Health';
  String get connectBody => zh
      ? '只读取今天的活动能量、静息能量和运动记录。'
      : 'Read today’s active energy, resting energy, and workouts only.';
  String get connectAction => zh ? '连接' : 'Connect';
  String get todayEnergy => zh ? 'Apple 健康 · 今日消耗' : 'Apple Health · Today';
  String get waiting => zh ? '等待健康数据' : 'Waiting for health data';
  String updatedAt(String time) => zh ? '更新于 $time' : 'Updated at $time';
  String get refresh => zh ? '刷新健康数据' : 'Refresh health data';
  String get readError => zh
      ? '暂时无法读取健康数据，请检查 Apple 健康权限。'
      : 'Health data could not be read. Check Apple Health permissions.';
  String get totalBurned => zh ? '总消耗' : 'Total burned';
  String get restingEnergy => zh ? '静息' : 'Resting';
  String get activeEnergy => zh ? '活动' : 'Active';
  String get todayWorkouts => zh ? '今日运动' : 'Today’s workouts';
  String get noWorkouts => zh ? '今天还没有运动记录。' : 'No workouts recorded today.';
  String durationMinutes(int minutes) => zh ? '$minutes 分钟' : '$minutes min';
  String get readOnlyFootnote => zh
      ? '只读连接。运动消耗已包含在活动能量中，不会重复计算。'
      : 'Read only. Workout energy is already included in active energy.';

  String activityName(String value) {
    final names = zh ? _zhActivities : _enActivities;
    return names[value] ?? names['other']!;
  }

  static const _zhActivities = <String, String>{
    'walking': '步行',
    'running': '跑步',
    'cycling': '骑行',
    'swimming': '游泳',
    'hiking': '徒步',
    'traditionalStrengthTraining': '传统力量训练',
    'functionalStrengthTraining': '功能性力量训练',
    'highIntensityIntervalTraining': '高强度间歇训练',
    'yoga': '瑜伽',
    'pilates': '普拉提',
    'elliptical': '椭圆机',
    'rowing': '划船',
    'stairClimbing': '爬楼梯',
    'dance': '舞蹈',
    'coreTraining': '核心训练',
    'crossTraining': '交叉训练',
    'mixedCardio': '混合有氧',
    'flexibility': '柔韧训练',
    'cooldown': '放松整理',
    'soccer': '足球',
    'basketball': '篮球',
    'tennis': '网球',
    'badminton': '羽毛球',
    'golf': '高尔夫',
    'boxing': '拳击',
    'martialArts': '武术',
    'jumpRope': '跳绳',
    'other': '其他运动',
  };

  static const _enActivities = <String, String>{
    'walking': 'Walking',
    'running': 'Running',
    'cycling': 'Cycling',
    'swimming': 'Swimming',
    'hiking': 'Hiking',
    'traditionalStrengthTraining': 'Strength training',
    'functionalStrengthTraining': 'Functional strength training',
    'highIntensityIntervalTraining': 'High-intensity interval training',
    'yoga': 'Yoga',
    'pilates': 'Pilates',
    'elliptical': 'Elliptical',
    'rowing': 'Rowing',
    'stairClimbing': 'Stair climbing',
    'dance': 'Dance',
    'coreTraining': 'Core training',
    'crossTraining': 'Cross training',
    'mixedCardio': 'Mixed cardio',
    'flexibility': 'Flexibility',
    'cooldown': 'Cooldown',
    'soccer': 'Soccer',
    'basketball': 'Basketball',
    'tennis': 'Tennis',
    'badminton': 'Badminton',
    'golf': 'Golf',
    'boxing': 'Boxing',
    'martialArts': 'Martial arts',
    'jumpRope': 'Jump rope',
    'other': 'Other workout',
  };
}
