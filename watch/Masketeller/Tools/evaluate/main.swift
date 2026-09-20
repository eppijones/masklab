import Foundation
struct Rec: Decodable {
 struct Meta: Decodable { var trueStitches: Int?; var automatic: Bool?; var detectedStitches: Int; var version: Int; var cyclesPerStitch: Double? }
 struct Event: Decodable { var t: Double; var kind: String; var stitches: Int; var beforeStitches: Int? }
 var meta: Meta; var t: [Double]; var ax: [Double]; var ay: [Double]; var az: [Double]; var gx: [Double]; var gy: [Double]; var gz: [Double]; var counterEvents: [Event]?
}
for path in CommandLine.arguments.dropFirst() {
 let r = try JSONDecoder().decode(Rec.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
 precondition([r.ax,r.ay,r.az,r.gx,r.gy,r.gz].allSatisfy { $0.count == r.t.count })
 precondition(zip(r.t,r.t.dropFirst()).allSatisfy { $0 < $1 })
 for variant in ["sensitive-reconstruction", "restrictive-reconstruction", "current-4.0", "no-delay", "isolated-candidate", "uncapped-baseline", "right-k3.55", "right-k3.3", "right-gate8"] {
  var cfg = CycleCounterConfig()
  var k = 3.4
  if variant == "sensitive-reconstruction" { cfg.gateNeed = 2; cfg.maxThreshold = 100; k = 1.5 }
  if variant == "right-k3.55" { k = 3.55 }
  if variant == "right-k3.3" { k = 3.3 }
  if variant == "right-gate8" { cfg.gateWindow = 8 }
  if variant == "uncapped-baseline" { cfg.maxThreshold = 1000 }
  if variant == "isolated-candidate" { cfg.gateNeed = 1; cfg.maxThreshold = 100; k = 5.0 }
  if variant == "restrictive-reconstruction" { k = r.meta.cyclesPerStitch ?? 4.84 }
  for interactive in [false,true] {
   let detector = CycleCounter(config: cfg)
   var core = CountingCore(); var count = 0; var cy = 0; var credited = 0
   var lastCycle = -Double.infinity; var lastAuto = -Double.infinity
   var events = r.counterEvents ?? []; events = events.enumerated().sorted { $0.element.t == $1.element.t ? $0.offset < $1.offset : $0.element.t < $1.element.t }.map(\.element)
   let manualIndices = events.indices.filter { events[$0].kind == "manual" }
   let episodeEnds = Set(manualIndices.enumerated().compactMap { offset, index -> Int? in
    let ends = offset + 1 == manualIndices.count || events[manualIndices[offset+1]].t - events[index].t > 1.2
    return ends && events[index].t >= 5 ? index : nil
   })
   var ei = 0; var historical = events.first?.stitches ?? 0; var manual = 0; var errors: [Int] = []; var nearUI = 0
   var emittedTimes: [Double] = []
   let taps = events.filter { $0.kind == "manual" }.map(\.t)
   let started = Date()
   for i in r.t.indices {
    let t = r.t[i]
    while ei < events.count && events[ei].t <= t {
     let ev = events[ei]; let delta = ev.stitches - (ev.beforeStitches ?? historical)
     if ev.kind == "manual" && interactive {
      count += delta; manual += delta; core.rebase(at: ev.t); credited = Int(Double(cy)/k)

     }
     if interactive && ["confirm-explicit", "set", "row", "undo", "remote-position", "start", "stop"].contains(ev.kind) { core.rebase(at: ev.t) }
     if episodeEnds.contains(ei) { errors.append(count - (ev.stitches - (events.first?.stitches ?? 0))) }
     historical = ev.stitches; ei += 1
    }
    let sample = MotionSample(timestamp: t,userAcceleration: SIMD3(r.ax[i],r.ay[i],r.az[i]),rotationRate: SIMD3(r.gx[i],r.gy[i],r.gz[i]))
    let n = detector.process(sample).filter { $0 == .cycle }.count
    if let boundary = detector.gapBoundary { core.rebase(at: boundary) }
    cy += n; if n > 0 { lastCycle = t }
    var added = 0
    if variant.hasPrefix("right-") || variant == "no-delay" || variant == "isolated-candidate" || variant == "sensitive-reconstruction" || variant == "uncapped-baseline" {
     if n > 0 { added = core.cycle(at: detector.lastCandidateTime ?? t,k:k) }
    } else {
     let goal = Int(Double(cy)/k)
     let delay = variant == "current-4.0" ? 1.6 : 0.0
     let minimum = variant == "current-4.0" ? 5.0 : 7.0
     if credited < goal && t-lastCycle >= delay && t-lastAuto >= minimum { credited += 1; added = 1; lastAuto = t }
    }
    count += added
    if added > 0 { emittedTimes.append(t) }
    if added > 0 && taps.contains(where: { abs($0-t) <= 1 }) { nearUI += added }
   }
   let truth = r.meta.trueStitches.map(String.init) ?? "unknown"
   let mae = errors.isEmpty ? "NA" : String(format:"%.2f",Double(errors.map(abs).reduce(0,+))/Double(errors.count))
   print("\(URL(fileURLWithPath:path).lastPathComponent),\(variant),\(interactive ? "interactive" : "detector-only"),\(cy),\(count-manual),\(manual),\(count),\(truth),\(mae),\(nearUI),\(Date().timeIntervalSince(started))")
   if let folder = ProcessInfo.processInfo.environment["EVALUATION_EVENTS_DIR"] {
    let url = URL(fileURLWithPath: folder, isDirectory: true)
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    let name = URL(fileURLWithPath:path).lastPathComponent + "." + variant + "." + (interactive ? "interactive" : "detector-only") + ".json"
    try JSONEncoder().encode(emittedTimes).write(to: url.appendingPathComponent(name), options: .atomic)
   }
  }
 }
}
