import Foundation
import HealthKit

/// Holder appen i live i bakgrunnen ved å kjøre en HealthKit-treningsøkt.
///
/// Uten dette suspenderer watchOS appen få sekunder etter at du senker armen,
/// og bevegelsesdataene stopper. En treningsøkt (type «annet») gir oss lov til
/// å kjøre kontinuerlig så lenge tellingen er i gang.
final class WorkoutKeeper: NSObject, HKWorkoutSessionDelegate {
    enum State: Equatable {
        case idle
        case running
        case unavailable
        case denied
        case failed(String)
    }

    private let store = HKHealthStore()
    private var session: HKWorkoutSession?
    private(set) var state: State = .idle
    var onStateChange: ((State) -> Void)?

    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    func start() async {
        guard isAvailable else { setState(.unavailable); return }
        guard session == nil else { return }

        do {
            try await store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: [])
        } catch {
            setState(.failed(error.localizedDescription))
            return
        }
        guard store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
            setState(.denied)
            return
        }

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .other
        configuration.locationType = .indoor

        do {
            let session = try HKWorkoutSession(healthStore: store, configuration: configuration)
            session.delegate = self
            self.session = session
            session.startActivity(with: Date())
            setState(.running)
        } catch {
            setState(.failed(error.localizedDescription))
        }
    }

    func stop() {
        guard let session else { return }
        session.end()
        self.session = nil
        setState(.idle)
    }

    private func setState(_ new: State) {
        state = new
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.onStateChange?(self.state)
        }
    }

    // MARK: - HKWorkoutSessionDelegate

    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState,
                        date: Date) {
        if toState == .ended || toState == .stopped {
            session = nil
            setState(.idle)
        }
    }

    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        session = nil
        setState(.failed(error.localizedDescription))
    }
}
