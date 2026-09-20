import Foundation

/// Én bevegelsesprøve fra klokka.
struct MotionSample {
    var timestamp: TimeInterval
    /// Brukerakselerasjon uten gravitasjon, i g.
    var userAcceleration: SIMD3<Double>
    /// Rotasjonshastighet, i rad/s.
    var rotationRate: SIMD3<Double>
}

enum DetectorEvent: Equatable {
    /// Én bekreftet vri-syklus i håndleddet (ikke én maske – se `CycleCounter`).
    case cycle
    /// Hendene har vært stille en stund.
    case paused
    /// Bevegelsen er i gang igjen etter pause.
    case resumed
}

struct CycleCounterConfig: Codable, Equatable {
    var sampleRate: Double = 50
    /// Stable baseline; alternatives are evaluated offline before activation.
    var threshold: Double = 2.5
    /// Legacy baseline upper bound; not a reliable gesture classifier.
    var maxThreshold: Double = 8
    var refractory: TimeInterval = 0.8
    var gateWindow: TimeInterval = 6.0
    var gateNeed: Int = 3
    /// Glidende gjennomsnitt over så mange prøver (5 ved 50 Hz = 0,1 s).
    var smoothingSamples: Int = 5
    /// Ingen sykler så lenge → pause.
    var pauseAfter: TimeInterval = 6.0
}

/// Øyeblikksbilde til UI.
struct DetectorSnapshot: Equatable {
    var activityLevel: Double = 0   // 0…1
    var confirmedCycles: Int = 0
    var isActive = false
}

/// Teller «vri-sykler» i håndleddet – de kraftige rotasjonene nålhånda gjør
/// når den legger garnet rundt nåla og trekker gjennom.
///
/// En syklus er *ikke* en ferdig maske. CountingCore omsetter nye sykler
/// til et anslag med fast aktiv k. Ingen timer frigjør gamle masker.
/// Tetthetsporten kan fortsatt miste isolerte, rolige bevegelser. Ingen
/// enkeltmaske-nøyaktighet er dokumentert for denne bevarte baselinen.
///
/// Ikke trådsikker – kall `process` fra én og samme kø.
struct CandidateDecision: Codable {
    var eventTime: Double
    var decisionTime: Double
    var magnitude: Double
    var accepted: Bool
    var reason: String
}

final class CycleCounter {
    private(set) var candidateDecision: CandidateDecision?
    private(set) var lastCandidateTime: Double?
    private(set) var gapBoundary: Double?
    private(set) var config: CycleCounterConfig
    private(set) var snapshot = DetectorSnapshot()

    // Glidende gjennomsnitt
    private var window: [Double] = []
    private var windowSum = 0.0

    // Toppdeteksjon (én prøve forsinket)
    private var prev1: (t: TimeInterval, v: Double)?
    private var prev2: Double?

    // Sykler
    private var lastRawTime: TimeInterval = -.infinity
    private var recentRaw: [TimeInterval] = []
    private var lastCycleTime: TimeInterval?
    private var paused = true
    private var lastSampleTime: Double?

    init(config: CycleCounterConfig = CycleCounterConfig()) {
        self.config = config
    }

    func update(config newConfig: CycleCounterConfig) {
        config = newConfig
    }

    func reset() {
        candidateDecision = nil
        lastCandidateTime = nil
        lastSampleTime = nil
        gapBoundary = nil
        window.removeAll()
        windowSum = 0
        prev1 = nil
        prev2 = nil
        lastRawTime = -.infinity
        recentRaw.removeAll()
        lastCycleTime = nil
        paused = true
        snapshot = DetectorSnapshot()
    }

    /// Mat inn én prøve. Returnerer hendelser som oppstod.
    func process(_ sample: MotionSample) -> [DetectorEvent] {
        candidateDecision = nil
        gapBoundary = nil
        var events: [DetectorEvent] = []
        let t = sample.timestamp
        let r = sample.rotationRate
        guard t.isFinite, r.x.isFinite, r.y.isFinite, r.z.isFinite else { return [] }
        if let last = lastSampleTime {
            guard t > last else { return [] }
            // Do not form a peak or density window across missing sensor evidence.
            if t - last > 0.5 {
                let confirmed = snapshot.confirmedCycles
                reset()
                gapBoundary = t
                snapshot.confirmedCycles = confirmed
                events.append(.paused)
            }
        }
        lastSampleTime = t
        let magnitude = (r.x * r.x + r.y * r.y + r.z * r.z).squareRoot()

        // Glidende gjennomsnitt
        window.append(magnitude)
        windowSum += magnitude
        if window.count > config.smoothingSamples {
            windowSum -= window.removeFirst()
        }
        let g = windowSum / Double(window.count)
        snapshot.activityLevel = min(1, g / 5.0)

        // Toppdeteksjon på forrige prøve
        if let p1 = prev1, let p2 = prev2,
           p1.v > config.threshold, p1.v <= config.maxThreshold,
           p1.v >= p2, p1.v > g,
           p1.t - lastRawTime > config.refractory {
            lastCandidateTime = p1.t
            lastRawTime = p1.t
            recentRaw.append(p1.t)
            recentRaw.removeAll { p1.t - $0 > config.gateWindow }
            if recentRaw.count >= config.gateNeed {
                if paused {
                    paused = false
                    events.append(.resumed)
                }
                lastCycleTime = p1.t
                snapshot.confirmedCycles += 1
                events.append(.cycle)
            }
        }
        if let p1 = prev1, let p2 = prev2, p1.v >= p2, p1.v > g, p1.v > config.threshold {
            let accepted = events.contains(.cycle)
            candidateDecision = CandidateDecision(eventTime: p1.t, decisionTime: t, magnitude: p1.v,
                accepted: accepted, reason: accepted ? "cycle" : (p1.v > config.maxThreshold ? "upper-threshold" : (p1.t == lastRawTime ? "density-gate" : "same-motion-refractory")))
        }
        prev2 = prev1?.v
        prev1 = (t, g)

        // Pause?
        let quietFor = t - (lastCycleTime ?? t)
        snapshot.isActive = !paused && quietFor < config.pauseAfter
        if !paused && quietFor > config.pauseAfter {
            paused = true
            events.append(.paused)
        }
        return events
    }
}
