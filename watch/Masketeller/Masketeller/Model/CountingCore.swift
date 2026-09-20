import Foundation

/// Shared by watch and replay. Only new sensor events can earn credit.
/// Corrections/resume discard fractional credit and already queued sensor events.
struct CountingCore: Codable, Equatable {
    var fraction = 0.0
    var barrier = -Double.greatestFiniteMagnitude
    var lastEvent = -Double.greatestFiniteMagnitude
    var automatic = 0
    mutating func rebase(at time: Double) {
        guard time.isFinite else { return }
        fraction = 0; barrier = max(barrier, time)
    }
    mutating func cycle(at eventTime: Double, k: Double) -> Int {
        guard eventTime.isFinite, eventTime > barrier, eventTime > lastEvent, k.isFinite, k >= 1 else { return 0 }
        lastEvent = eventTime
        fraction += 1 / k
        guard fraction + 1e-10 >= 1 else { return 0 }
        fraction = max(0, fraction - 1)
        automatic += 1
        return 1
    }
}

struct CorrectionEvidence: Codable, Identifiable {
    var id: String
    var session: String
    var time: Double
    var delta: Int
    var before: Int
    var after: Int
    var group: String
    var tracking: Bool
    var valid = true
    /// Count constraints only. Tap time is never a stitch label.
    var attribution = "segment-only"
}

struct CalibrationSegment: Codable {
    var session: String
    var wrist: String
    var duration: Double
    var cycles: Int
    var count: Int
    var evidenceIDs: [String]
    var valid = true
}

/// Small local calibration with session-held-out promotion. Never adjusts at a tap.
struct Personalization: Codable {
    var schema = 1
    var version = 0
    var active = 3.4
    var previous = 3.4
    var candidate: Double?
    var wrist = "right"
    var reason = "Samler bekreftede segmenter"
    var evidence: [CorrectionEvidence] = []
    var segments: [CalibrationSegment] = []
    var promotedEvidence: [String] = []
    var lastAssessmentSession: String?
    var audit: [String] = []

    mutating func capture(_ event: CorrectionEvidence) {
        evidence.append(event)
        if evidence.count > 500 { evidence.removeFirst(evidence.count - 500) }
    }
    mutating func invalidate(_ id: String) {
        for i in evidence.indices where evidence[i].id == id { evidence[i].valid = false }
        for i in segments.indices where segments[i].evidenceIDs.contains(id) { segments[i].valid = false }
        if promotedEvidence.contains(id) {
            // A previous personalized version may share the invalid label.
            // Return to the independently frozen baseline, not that descendant.
            active = 3.4; previous = 3.4; candidate = nil; promotedEvidence = []; version += 1
            record("Tilbake til grunnprofil: bekreftelse angret")
        }
    }
    mutating func add(_ segment: CalibrationSegment) {
        guard segment.duration >= 120, segment.count >= 20, segment.cycles >= 20,
              segment.wrist == wrist else { reason = "For kort eller usikkert segment"; return }
        segments.append(segment)
        if segments.count > 40 { segments.removeFirst() }
        reason = "Samler bekreftede segmenter"
    }
    mutating func assess() {
        let usable = segments.filter { $0.valid && $0.wrist == wrist }
        let sessions = Array(Set(usable.map(\.session))).sorted()
        guard sessions.count >= 4, let heldOut = usable.last?.session else {
            record("Beholdt: trenger minst fire bekreftede økter"); return
        }
        guard lastAssessmentSession != heldOut else { return }
        lastAssessmentSession = heldOut
        let train = usable.filter { $0.session != heldOut }
        let validation = usable.filter { $0.session == heldOut }
        let ratio = Double(train.reduce(0) { $0 + $1.cycles }) / Double(train.reduce(0) { $0 + $1.count })
        // Conservative step; broad absolute bounds are safety bounds, not accuracy claims.
        let proposed = min(6, max(2, min(active * 1.05, max(active * 0.95, ratio))))
        candidate = proposed
        func error(_ s: CalibrationSegment, _ k: Double) -> Double { abs(Double(s.cycles) / k - Double(s.count)) }
        let improves = validation.reduce(0) { $0 + error($1, active) - error($1, proposed) } >= 1
        let noRegression = usable.allSatisfy { error($0, proposed) <= error($0, active) + 0.5 }
        guard improves, noRegression else { record("Avvist: ingen trygg gevinst på holdt utenfor økt"); return }
        previous = active; active = proposed; version += 1
        promotedEvidence = usable.flatMap(\.evidenceIDs)
        record("Oppdatert v\(version): \(previous) → \(active)")
    }
    mutating func rollback() {
        active = previous; candidate = nil; version += 1; promotedEvidence = []
        record("Tilbakerullet til \(active)")
    }
    mutating func reset() {
        active = 3.4; previous = 3.4; candidate = nil; segments = []; promotedEvidence = []; lastAssessmentSession = nil; version += 1
        record("Lærte parametere nullstilt")
    }
    private mutating func record(_ message: String) {
        reason = message; audit.append(message)
        if audit.count > 50 { audit.removeFirst() }
    }
}

struct CorrectionUndo: Codable {
    var id: String
    var delta: Int
    var totalDelta: Int
}

struct RecipePosition: Equatable {
    var round: Int
    var completed: Int
    mutating func move(_ delta: Int, firstRound: Int, autoAdvance: Bool, target: (Int) -> Int) -> Int {
        var applied = 0
        for _ in 0..<abs(delta) {
            if delta > 0 {
                completed += 1; applied += 1
                if target(round) > 0 && completed >= target(round) && autoAdvance { round += 1; completed = 0 }
            } else {
                if completed == 0 {
                    guard round > firstRound, target(round-1) > 0 else { break }
                    round -= 1; completed = target(round)
                }
                guard completed > 0 else { break }
                completed -= 1; applied -= 1
            }
        }
        return applied
    }
}
