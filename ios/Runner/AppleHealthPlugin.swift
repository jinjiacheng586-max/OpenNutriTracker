import Foundation
import Flutter
import HealthKit

/// Read-only HealthKit bridge used by the Flutter application.
///
/// Important: workout calories are returned as descriptive detail only. The
/// active-energy query already includes energy samples associated with
/// workouts, so callers must never add workout calories to the daily total.
final class AppleHealthPlugin: NSObject, FlutterPlugin, FlutterStreamHandler {
    private static let methodChannelName = "com.opennutritracker/health"
    private static let eventChannelName = "com.opennutritracker/health_updates"
    private static let authorizationRequestedKey = "appleHealthAuthorizationRequested"

    private let healthStore = HKHealthStore()
    private var eventSink: FlutterEventSink?
    private var observerQueries: [HKObserverQuery] = []
    private var isObserving = false

    static func register(with registrar: FlutterPluginRegistrar) {
        let instance = AppleHealthPlugin()
        let methodChannel = FlutterMethodChannel(
            name: methodChannelName,
            binaryMessenger: registrar.messenger()
        )
        let eventChannel = FlutterEventChannel(
            name: eventChannelName,
            binaryMessenger: registrar.messenger()
        )
        registrar.addMethodCallDelegate(instance, channel: methodChannel)
        eventChannel.setStreamHandler(instance)
        instance.startObserversIfNeeded()
    }

    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "getStatus":
            result(statusPayload())
        case "requestAuthorization":
            requestAuthorization(result: result)
        case "getTodaySummary":
            fetchTodaySummary { payload in
                DispatchQueue.main.async { result(payload) }
            }
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    func onListen(
        withArguments arguments: Any?,
        eventSink events: @escaping FlutterEventSink
    ) -> FlutterError? {
        eventSink = events
        startObserversIfNeeded()
        if hasRequestedAuthorization {
            fetchTodaySummary { [weak self] payload in
                DispatchQueue.main.async { self?.eventSink?(payload) }
            }
        }
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }

    private var hasRequestedAuthorization: Bool {
        UserDefaults.standard.bool(forKey: Self.authorizationRequestedKey)
    }

    private func statusPayload() -> [String: Any] {
        [
            "available": HKHealthStore.isHealthDataAvailable(),
            "authorizationRequested": hasRequestedAuthorization,
        ]
    }

    private func requestAuthorization(result: @escaping FlutterResult) {
        guard HKHealthStore.isHealthDataAvailable() else {
            result(statusPayload())
            return
        }

        healthStore.requestAuthorization(toShare: [], read: readTypes) {
            [weak self] success, error in
            guard let self else { return }
            if let error {
                DispatchQueue.main.async {
                    result(
                        FlutterError(
                            code: "health_authorization_failed",
                            message: error.localizedDescription,
                            details: nil
                        )
                    )
                }
                return
            }

            if success {
                UserDefaults.standard.set(
                    true,
                    forKey: Self.authorizationRequestedKey
                )
                self.startObserversIfNeeded()
                self.fetchTodaySummary { payload in
                    DispatchQueue.main.async { result(payload) }
                }
            } else {
                DispatchQueue.main.async { result(self.statusPayload()) }
            }
        }
    }

    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        if let active = HKObjectType.quantityType(
            forIdentifier: .activeEnergyBurned
        ) {
            types.insert(active)
        }
        if let basal = HKObjectType.quantityType(
            forIdentifier: .basalEnergyBurned
        ) {
            types.insert(basal)
        }
        types.insert(HKObjectType.workoutType())
        return types
    }

    private func startObserversIfNeeded() {
        guard hasRequestedAuthorization,
              HKHealthStore.isHealthDataAvailable(),
              !isObserving else {
            return
        }
        isObserving = true

        for sampleType in readTypes.compactMap({ $0 as? HKSampleType }) {
            let query = HKObserverQuery(
                sampleType: sampleType,
                predicate: nil
            ) { [weak self] _, completionHandler, error in
                guard error == nil, let self else {
                    completionHandler()
                    return
                }
                self.fetchTodaySummary { payload in
                    DispatchQueue.main.async { self.eventSink?(payload) }
                    completionHandler()
                }
            }
            observerQueries.append(query)
            healthStore.execute(query)
            healthStore.enableBackgroundDelivery(
                for: sampleType,
                frequency: .immediate
            ) { _, _ in
                // The foreground observer still works if iOS declines
                // background delivery. The next app resume also refreshes.
            }
        }
    }

    private func fetchTodaySummary(
        completion: @escaping ([String: Any]) -> Void
    ) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(statusPayload())
            return
        }

        let start = Calendar.current.startOfDay(for: Date())
        let end = Date()
        let predicate = HKQuery.predicateForSamples(
            withStart: start,
            end: end,
            options: [.strictStartDate]
        )
        let group = DispatchGroup()
        let valueQueue = DispatchQueue(
            label: "com.opennutritracker.health.values"
        )
        var activeEnergyKcal = 0.0
        var basalEnergyKcal = 0.0
        var workouts: [[String: Any]] = []

        group.enter()
        sumEnergy(identifier: .activeEnergyBurned, predicate: predicate) {
            value in
            valueQueue.sync { activeEnergyKcal = value }
            group.leave()
        }

        group.enter()
        sumEnergy(identifier: .basalEnergyBurned, predicate: predicate) {
            value in
            valueQueue.sync { basalEnergyKcal = value }
            group.leave()
        }

        group.enter()
        queryWorkouts(predicate: predicate) { values in
            valueQueue.sync { workouts = values }
            group.leave()
        }

        group.notify(queue: valueQueue) {
            completion([
                "available": true,
                "authorizationRequested": self.hasRequestedAuthorization,
                "activeEnergyKcal": activeEnergyKcal,
                "basalEnergyKcal": basalEnergyKcal,
                "totalEnergyKcal": activeEnergyKcal + basalEnergyKcal,
                "updatedAtMillis": Int64(Date().timeIntervalSince1970 * 1000),
                "workouts": workouts,
            ])
        }
    }

    private func sumEnergy(
        identifier: HKQuantityTypeIdentifier,
        predicate: NSPredicate,
        completion: @escaping (Double) -> Void
    ) {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier)
        else {
            completion(0)
            return
        }
        let query = HKStatisticsQuery(
            quantityType: type,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, statistics, _ in
            let value = statistics?.sumQuantity()?.doubleValue(
                for: .kilocalorie()
            ) ?? 0
            completion(value)
        }
        healthStore.execute(query)
    }

    private func queryWorkouts(
        predicate: NSPredicate,
        completion: @escaping ([[String: Any]]) -> Void
    ) {
        let sort = NSSortDescriptor(
            key: HKSampleSortIdentifierStartDate,
            ascending: false
        )
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, _ in
            let activeType = HKObjectType.quantityType(
                forIdentifier: .activeEnergyBurned
            )
            let values = (samples as? [HKWorkout] ?? []).map { workout in
                let energy = activeType.flatMap {
                    workout.statistics(for: $0)?.sumQuantity()
                }?.doubleValue(for: .kilocalorie()) ?? 0
                return [
                    "id": workout.uuid.uuidString,
                    "activityType": Self.activityName(
                        for: workout.workoutActivityType
                    ),
                    "startMillis": Int64(
                        workout.startDate.timeIntervalSince1970 * 1000
                    ),
                    "endMillis": Int64(
                        workout.endDate.timeIntervalSince1970 * 1000
                    ),
                    "durationSeconds": workout.duration,
                    "activeEnergyKcal": energy,
                ] as [String: Any]
            }
            completion(values)
        }
        healthStore.execute(query)
    }

    private static func activityName(
        for type: HKWorkoutActivityType
    ) -> String {
        switch type {
        case .walking: return "walking"
        case .running: return "running"
        case .cycling: return "cycling"
        case .swimming: return "swimming"
        case .hiking: return "hiking"
        case .traditionalStrengthTraining: return "traditionalStrengthTraining"
        case .functionalStrengthTraining: return "functionalStrengthTraining"
        case .highIntensityIntervalTraining: return "highIntensityIntervalTraining"
        case .yoga: return "yoga"
        case .pilates: return "pilates"
        case .elliptical: return "elliptical"
        case .rowing: return "rowing"
        case .stairClimbing: return "stairClimbing"
        case .dance: return "dance"
        case .coreTraining: return "coreTraining"
        case .crossTraining: return "crossTraining"
        case .mixedCardio: return "mixedCardio"
        case .flexibility: return "flexibility"
        case .cooldown: return "cooldown"
        case .soccer: return "soccer"
        case .basketball: return "basketball"
        case .tennis: return "tennis"
        case .badminton: return "badminton"
        case .golf: return "golf"
        case .boxing: return "boxing"
        case .martialArts: return "martialArts"
        case .jumpRope: return "jumpRope"
        default: return "other"
        }
    }
}
