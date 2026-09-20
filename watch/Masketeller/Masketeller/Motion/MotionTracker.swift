import Foundation
import CoreMotion

/// Leser bevegelsesdata fra klokka og kjører dem gjennom `CycleCounter`
/// på en egen kø. Hendelser leveres på hovedtråden.
final class MotionTracker {
    struct Update {
        var cycleTimes: [Double]
        var events: [DetectorEvent]
        var snapshot: DetectorSnapshot
        var gapBoundary: Double? = nil
    }

    static let sampleRate: Double = 50

    var onUpdate: ((Update) -> Void)?

    private let manager = CMMotionManager()
    private let queue: OperationQueue = {
        let q = OperationQueue()
        q.name = "no.espenhorne.Masketeller.motion"
        q.maxConcurrentOperationCount = 1
        q.qualityOfService = .userInteractive
        return q
    }()
    private let shadow = ShadowDetector()
    private let detector: CycleCounter
    private var lastSnapshotPush: TimeInterval = 0
    private(set) var isRunning = false
    /// Aktivt opptak. Settes/leses bare på bevegelseskøen (via `setRecorder`).
    private var recorder: MotionRecorder?

    var isAvailable: Bool { manager.isDeviceMotionAvailable }

    init(config: CycleCounterConfig) {
        var cfg = config
        cfg.sampleRate = Self.sampleRate
        detector = CycleCounter(config: cfg)
    }

    func start() {
        guard !isRunning, manager.isDeviceMotionAvailable else { return }
        cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "start")
        isRunning = true
        manager.deviceMotionUpdateInterval = 1.0 / Self.sampleRate
        queue.addOperation { [detector] in detector.reset() }
        manager.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: queue) { [weak self] motion, _ in
            guard let self, let motion else { return }
            let sample = MotionSample(
                timestamp: motion.timestamp,
                userAcceleration: SIMD3(motion.userAcceleration.x, motion.userAcceleration.y, motion.userAcceleration.z),
                rotationRate: SIMD3(motion.rotationRate.x, motion.rotationRate.y, motion.rotationRate.z)
            )
            let events = self.detector.process(sample)
            let shadowEvent = self.shadow.process(sample, gravity: SIMD3(motion.gravity.x, motion.gravity.y, motion.gravity.z))
            self.recorder?.append(motion, events: events, candidate: self.detector.candidateDecision,
                                  shadow: shadowEvent.map { [$0] } ?? [])
            // Ikke spam hovedtråden: send øyeblikksbilde ~10 ganger i sekundet
            // eller når noe faktisk skjedde.
            let shouldPush = !events.isEmpty || motion.timestamp - self.lastSnapshotPush > 0.1
            guard shouldPush else { return }
            self.lastSnapshotPush = motion.timestamp
            let update = Update(cycleTimes: events.contains(.cycle) ? [self.detector.lastCandidateTime ?? motion.timestamp] : [], events: events, snapshot: self.detector.snapshot, gapBoundary: self.detector.gapBoundary)
            DispatchQueue.main.async { [weak self] in
                self?.onUpdate?(update)
            }
        }
    }

    func cancelShadow(at time: Double, reason: String) {
        queue.addOperation { [weak self] in
            guard let self else { return }
            if let event = self.shadow.cancel(at: time, reason: reason) { self.recorder?.logShadow(event) }
            self.recorder?.logShadow(ShadowEvent(eventTime: time, decisionTime: time, kind: "boundary", reason: reason, phase: "instrumentation-only"))
        }
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        manager.stopDeviceMotionUpdates()
        cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "stop")
    }

    /// Oppdater detektor-innstillinger trygt fra hovedtråden.
    func update(config: CycleCounterConfig) {
        var cfg = config
        cfg.sampleRate = Self.sampleRate
        queue.addOperation { [detector] in
            detector.update(config: cfg)
        }
    }

    func resetDetector() {
        cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "detector-reset")
        queue.addOperation { [detector] in
            detector.reset()
        }
    }

    /// Barrier on the serial sensor queue before saving its immutable snapshot.
    func detachRecorder() {
        queue.addOperations([BlockOperation { [weak self] in self?.recorder = nil }], waitUntilFinished: true)
    }

    /// Start eller stopp opptak. `completion` kalles på hovedtråden når
    /// byttet er gjennomført (så ingen prøver går tapt eller dobbeltføres).
    func setRecorder(_ recorder: MotionRecorder?, completion: (() -> Void)? = nil) {
        queue.addOperation { [weak self] in
            self?.recorder = recorder
            if let completion {
                DispatchQueue.main.async(execute: completion)
            }
        }
    }
}
