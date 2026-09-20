import Foundation

/// Research candidate only. No reference to CounterModel, haptics or network.
struct ShadowConfiguration: Codable, Equatable {
    var version = "signed-sequence-1"
    // Promotion requires a separately reviewed video/holdout report.
    var mode = "instrumentation-only"
    var onset = 1.5
    var release = 0.7
    var releaseDuration = 0.12
    var minimumDuration = 0.6
    var maximumDuration = 12.0
    var minimumIntegral = 2.0
    var maximumAcceleration = 1.5
    var maximumGravityChange = 0.8
    var minimumReversals = 2
}

struct ShadowEvent: Codable, Equatable {
    var eventTime: Double
    var decisionTime: Double
    var kind: String
    var reason: String
    var phase: String
    var configurationVersion = "signed-sequence-1"
}

/// Bounded causal direction/release hypothesis. A reversal is never itself a stitch.
final class ShadowDetector {
    let configuration: ShadowConfiguration
    private var lastTime: Double?
    private var smooth = 0.0
    private var start: Double?
    private var quietStart: Double?
    private var gravityAtStart = SIMD3<Double>(0, 0, -1)
    private var sign = 0
    private var reversals = 0
    private var integral = 0.0
    private var maxAcceleration = 0.0
    private var maxGravityChange = 0.0
    private var barrier = -Double.greatestFiniteMagnitude

    init(configuration: ShadowConfiguration = ShadowConfiguration()) { self.configuration = configuration }
    private func clear() {
        start = nil; quietStart = nil; sign = 0; reversals = 0
        integral = 0; maxAcceleration = 0; maxGravityChange = 0
    }
    func cancel(at time: Double, reason: String) -> ShadowEvent? {
        guard time.isFinite else { return nil }
        barrier = max(barrier, time)
        let began = start
        clear(); smooth = 0; lastTime = nil
        guard let began else { return nil }
        return ShadowEvent(eventTime: began, decisionTime: time, kind: "rejected", reason: reason, phase: "cancelled")
    }
    func process(_ sample: MotionSample, gravity: SIMD3<Double>) -> ShadowEvent? {
        guard configuration.mode == "research" || configuration.mode == "qualified-shadow" else { return nil }
        let t = sample.timestamp
        let values = [t, sample.rotationRate.x, sample.rotationRate.y, sample.rotationRate.z,
                      sample.userAcceleration.x, sample.userAcceleration.y, sample.userAcceleration.z,
                      gravity.x, gravity.y, gravity.z]
        guard values.allSatisfy(\.isFinite) else { return cancel(at: lastTime ?? barrier, reason: "invalid-sample") }
        guard t > barrier else { return nil }
        if let previous = lastTime, t <= previous {
            return cancel(at: previous, reason: "out-of-order-sample")
        }
        let dt = lastTime.map { t - $0 } ?? 0.02
        if dt > 0.5 { return cancel(at: t, reason: "sensor-gap") }
        lastTime = t
        // Fixed device X axis for this right-wrist research profile; no future PCA.
        smooth += min(1, dt / 0.06) * (sample.rotationRate.x - smooth)
        if start == nil {
            guard abs(smooth) >= configuration.onset else { return nil }
            start = t; gravityAtStart = gravity; sign = smooth > 0 ? 1 : -1
        }
        guard let began = start else { return nil }
        if t - began > configuration.maximumDuration { return cancel(at: t, reason: "expired-incomplete") }
        integral += abs(smooth) * dt
        let a = sample.userAcceleration
        maxAcceleration = max(maxAcceleration, sqrt(a.x*a.x+a.y*a.y+a.z*a.z))
        let dg = gravity - gravityAtStart
        maxGravityChange = max(maxGravityChange, sqrt(dg.x*dg.x+dg.y*dg.y+dg.z*dg.z))
        if abs(smooth) >= configuration.onset {
            let current = smooth > 0 ? 1 : -1
            if current != sign { reversals += 1; sign = current }
        }
        if abs(smooth) < configuration.release {
            if quietStart == nil { quietStart = t }
        } else { quietStart = nil }
        guard let quiet = quietStart, t - quiet >= configuration.releaseDuration else { return nil }
        // This is fresh sensor evidence, never a timer callback.
        let reason: String
        if reversals < configuration.minimumReversals { reason = "insufficient-phases" }
        else if t-began < configuration.minimumDuration || integral < configuration.minimumIntegral { reason = "insufficient-motion" }
        else if maxAcceleration > configuration.maximumAcceleration { reason = "abrupt-acceleration" }
        else if maxGravityChange > configuration.maximumGravityChange { reason = "orientation-change" }
        else { reason = "sequence-release-hypothesis" }
        let result = ShadowEvent(eventTime: quiet, decisionTime: t,
            kind: reason == "sequence-release-hypothesis" ? "prediction" : "rejected", reason: reason, phase: "release")
        clear()
        return result
    }
}
