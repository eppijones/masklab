import Foundation
struct ReplayEvent: Decodable { var t: Double; var kind: String; var sequence: Int?; var parameters: Settings? }
struct ReplayRecording: Decodable {
    struct Meta: Decodable {
        var recordingID: String?; var sessionID: String?; var timeOriginUptime: Double?
        var startCore: CountingCore?; var startK: Double?; var cyclesPerStitch: Double?
        var detectorConfiguration: CycleCounterConfig?; var startSettings: Settings?
    }
    var meta: Meta; var t: [Double]; var ax: [Double]; var ay: [Double]; var az: [Double]
    var gx: [Double]; var gy: [Double]; var gz: [Double]; var grx: [Double]; var gry: [Double]; var grz: [Double]
    var counterEvents: [ReplayEvent]?; var candidateEvents: [CandidateDecision]?
}
@main struct ReplaySession {
 static func main() throws {
    var recordings = try CommandLine.arguments.dropFirst().map { path -> (String, ReplayRecording) in
        let rec = try JSONDecoder().decode(ReplayRecording.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
        return (path, rec)
    }
    recordings.sort { ($0.1.meta.timeOriginUptime ?? 0) < ($1.1.meta.timeOriginUptime ?? 0) }
    let variant = ProcessInfo.processInfo.environment["REPLAY_VARIANT"] ?? "baseline"
    var detector = CycleCounter(); var core = CountingCore()
    var config = ShadowConfiguration(); config.mode = "research"
    if variant == "sequence-low" { config.onset = 1.0; config.minimumIntegral = 1.5 }
    if variant == "sequence-high" { config.onset = 2.0; config.minimumIntegral = 3.0 }
    var shadow = ShadowDetector(configuration: config)
    var previous: ReplayRecording?; var emitted: [Double] = []; var diagnostics: [ShadowEvent] = []
    var reports: [[String: Any]] = []
    for (recordingIndex, item) in recordings.enumerated() {
        let (path, r) = item
        let origin = r.meta.timeOriginUptime ?? 0
        precondition([r.ax,r.ay,r.az,r.gx,r.gy,r.gz,r.grx,r.gry,r.grz].allSatisfy { $0.count == r.t.count })
        precondition(zip(r.t,r.t.dropFirst()).allSatisfy { $0 < $1 })
        let gap = previous.flatMap { p -> Double? in
            guard let a=p.meta.timeOriginUptime, let b=r.meta.timeOriginUptime, let x=p.t.last, let y=r.t.first else {return nil}
            return b+y-a-x
        }
        let joined = r.meta.sessionID != nil && previous?.meta.sessionID == r.meta.sessionID && gap.map { $0>0 && $0<=0.5 } == true
        if !joined {
            detector = CycleCounter(config: r.meta.detectorConfiguration ?? CycleCounterConfig())
            core = r.meta.startCore ?? CountingCore()
            shadow = ShadowDetector(configuration: config)
            // Legacy starts without uptime cannot safely replay absolute barriers.
            if r.meta.timeOriginUptime == nil { core = CountingCore() }
        }
        var k = r.meta.startK ?? r.meta.cyclesPerStitch ?? 3.4
        let events = (r.counterEvents ?? []).enumerated().sorted {
            $0.element.t == $1.element.t ? ($0.element.sequence ?? $0.offset) < ($1.element.sequence ?? $1.offset) : $0.element.t < $1.element.t
        }.map(\.element)
        var ei=0; let before=emitted.count; let researchBefore=diagnostics.count
        let next = recordingIndex + 1 < recordings.count ? recordings[recordingIndex+1].1 : nil
        let nextGap = next.flatMap { n -> Double? in
            guard let no=n.meta.timeOriginUptime, let ro=r.meta.timeOriginUptime, let last=r.t.last, let first=n.t.first else { return nil }
            return no+first-ro-last
        }
        let rollover = r.meta.sessionID != nil && next?.meta.sessionID == r.meta.sessionID && nextGap.map { $0>0 && $0<=0.5 } == true && !events.contains { $0.kind == "ui-stop" }
        func handle(_ e: ReplayEvent) {
            let et=origin+e.t
            if rollover && e.kind == "stop" { return }
                if ["manual","set","row","undo","remote-position","confirm-explicit","start","stop"].contains(e.kind) && !(joined && e.kind == "start") {
                    core.rebase(at: et)
                    if let x=shadow.cancel(at: et, reason:e.kind) { diagnostics.append(x) }
                }
                if e.kind.hasPrefix("haptic-") || e.kind.hasPrefix("ui-") {
                    if let x=shadow.cancel(at:et,reason:e.kind) { diagnostics.append(x) }
                }
                if e.kind == "settings-change", let settings=e.parameters {
                    detector.update(config: settings.detectorConfig)
                    k=settings.cyclesPerStitch(for:settings.physicalWrist ?? .right)
                    core.rebase(at:et)
                    _=shadow.cancel(at:et,reason:"settings-change")
                }
        }
        for i in r.t.indices {
            let t=origin+r.t[i]
            while ei<events.count && origin+events[ei].t<=t {
                handle(events[ei]); ei+=1
            }
            let sample=MotionSample(timestamp:t,userAcceleration:SIMD3(r.ax[i],r.ay[i],r.az[i]),rotationRate:SIMD3(r.gx[i],r.gy[i],r.gz[i]))
            let ev=detector.process(sample)
            if let gap=detector.gapBoundary {core.rebase(at:gap)}
            if ev.contains(.cycle), core.cycle(at:detector.lastCandidateTime ?? t,k:k)>0 {emitted.append(detector.lastCandidateTime ?? t)}
            if let x=shadow.process(sample,gravity:SIMD3(r.grx[i],r.gry[i],r.grz[i])) {diagnostics.append(x)}
        }
        // Flush interactions after the final sensor sample; a proven rollover is not a physical stop.
        while ei < events.count { handle(events[ei]); ei += 1 }
        let recorded=events.filter { $0.kind == "auto" }.count
        reports.append(["file":path,"recordingID":r.meta.recordingID ?? "unknown","joinedPrevious":joined,"recordedAuto":recorded,"replayedAuto":emitted.count-before,"baselineCountMatches":emitted.count-before == recorded,"shadowDecisions":diagnostics.count-researchBefore])
        previous=r
    }
    let encoder=JSONEncoder();encoder.outputFormatting=[.sortedKeys]
    let diag=try JSONSerialization.jsonObject(with:encoder.encode(diagnostics))
    let output:[String:Any]=["variant":variant,"reports":reports,"baselineEventTimes":emitted,"shadowEvents":diag,"shadowConfiguration":try JSONSerialization.jsonObject(with:encoder.encode(config)),"scope":"Baseline parity first; research predictions do not control counters. Count parity does not establish physical accuracy."]
    print(String(data:try JSONSerialization.data(withJSONObject:output,options:[.sortedKeys]),encoding:.utf8)!)
 }
}
