import 'dart:convert';
import 'dart:io' show gzip;

import 'package:opennutritracker/core/domain/entity/user_activity_entity.dart';

class SharedActivityParseException implements Exception {
  final String message;
  SharedActivityParseException(this.message);
}

// Array field order: [code, duration]
class SharedActivityItem {
  final String code;
  final double duration;

  const SharedActivityItem({required this.code, required this.duration});

  factory SharedActivityItem.fromUserActivityEntity(
      UserActivityEntity activity) {
    return SharedActivityItem(
      code: activity.physicalActivityEntity.code,
      duration: activity.duration,
    );
  }

  factory SharedActivityItem.fromArray(List<dynamic> a) {
    return SharedActivityItem(
      code: a[0] as String,
      duration: (a[1] as num).toDouble(),
    );
  }

  List<dynamic> toArray() => [code, duration];
}

class SharedActivityPayload {
  static const int _currentVersion = 1;

  final int version;
  final List<SharedActivityItem> items;

  int get totalCount => items.length;

  const SharedActivityPayload({required this.version, required this.items});

  factory SharedActivityPayload.fromUserActivityList(
      List<UserActivityEntity> activities) {
    return SharedActivityPayload(
      version: _currentVersion,
      items: activities
          .map(SharedActivityItem.fromUserActivityEntity)
          .toList(),
    );
  }

  factory SharedActivityPayload.fromJsonString(String input) {
    try {
      String jsonString;
      try {
        jsonString = utf8
            .decode(gzip.decode(base64Url.decode(base64Url.normalize(input))));
      } catch (_) {
        jsonString = input;
      }

      final decoded = jsonDecode(jsonString);
      if (decoded is! List) {
        throw SharedActivityParseException('Invalid payload format');
      }

      final version = decoded[0] as int;
      if (version != _currentVersion) {
        throw SharedActivityParseException(
            'Unsupported payload version: $version');
      }

      final rawItems = decoded[1] as List<dynamic>;
      return SharedActivityPayload(
        version: version,
        items: rawItems
            .map((e) => SharedActivityItem.fromArray(e as List<dynamic>))
            .toList(),
      );
    } on SharedActivityParseException {
      rethrow;
    } catch (e) {
      throw SharedActivityParseException('Failed to parse payload: $e');
    }
  }

  String toJsonString() {
    final json = jsonEncode([
      version,
      items.map((i) => i.toArray()).toList(),
    ]);
    return base64Url.encode(gzip.encode(utf8.encode(json)));
  }
}
