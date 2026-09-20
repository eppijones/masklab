import Foundation
import CoreMotion

@main struct Tests {
 @MainActor static func main() throws {
  var checks = 0
  func check(_ message: String, _ condition: @autoclosure () -> Bool) {
   precondition(condition(), message); checks += 1; print("PASS \(message)")
  }
  let dir = FileManager.default.temporaryDirectory.appendingPathComponent("masketeller-test-" + UUID().uuidString)
  try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  RecordingStore.directoryOverride = dir.appendingPathComponent("recordings")
  var settings = Settings(); settings.version = Settings.currentVersion; settings.keepAwake = false; settings.save()
  let store = SessionStore(directory: dir)
  store.saveActive(ActiveSessionState(started: Date(), stitches: 50, rows: 29, stitchesInRow: 50))
  let model = CounterModel(directory: dir, enableSync: false)
  check("production model loads bundled pattern", model.pattern != nil)
  model.adjust(by: -10)
  check("50 to 40 immediately", model.stitches == 40 && model.stitchesInRow == 40)
  check("k frozen after correction", model.cyclesPerStitch == 3.4)
  let restored = CounterModel(directory: dir, enableSync: false)
  check("restart preserves progress", restored.stitches == 40 && restored.stitchesInRow == 40)
  check("restart preserves undo", restored.canUndo)
  restored.undo()
  check("undo survives restart", restored.stitches == 50)
  restored.startTracking()
  let tracker = MotionTracker.latest!
  restored.adjust(by: -10)
  let base = ProcessInfo.processInfo.systemUptime
  tracker.onUpdate?(.init(cycleTimes: [base-10], events: [.cycle], snapshot: DetectorSnapshot()))
  check("queued old sample discarded", restored.stitches == 40)
  for n in 1...4 { tracker.onUpdate?(.init(cycleTimes: [base+Double(n)], events: [.cycle], snapshot: DetectorSnapshot())) }
  check("new cycle sequence adds once", restored.stitches == 41)
  restored.undo()
  check("undo retains interleaved auto", restored.stitches == 51)
  restored.stopTracking()
  let count = restored.stitches
  for _ in 0..<8 { restored.adjust(by: 1) }
  check("eight rapid taps each once", restored.stitches == count+8)
  restored.adjust(by: 0)
  check("confirmation does not change count", restored.stitches == count+8)
  restored.startTracking()
  let confirmationTracker = MotionTracker.latest!
  let confirmationBase = ProcessInfo.processInfo.systemUptime + 100
  for n in 1...3 { confirmationTracker.onUpdate?(.init(cycleTimes: [confirmationBase+Double(n)], events: [.cycle], snapshot: DetectorSnapshot())) }
  let beforeConfirm = restored.stitches
  restored.confirmCount()
  confirmationTracker.onUpdate?(.init(cycleTimes: [confirmationBase+4], events: [.cycle], snapshot: DetectorSnapshot()))
  check("confirmation discards fractional credit", restored.stitches == beforeConfirm)
  let beforeDuplicate = restored.cycles
  confirmationTracker.onUpdate?(.init(cycleTimes: [confirmationBase+4], events: [.cycle], snapshot: DetectorSnapshot()))
  check("duplicate delivery cannot contaminate cycle evidence", restored.cycles == beforeDuplicate)
  for n in 5...6 { confirmationTracker.onUpdate?(.init(cycleTimes: [confirmationBase+Double(n)], events: [.cycle], snapshot: DetectorSnapshot())) }
  confirmationTracker.onUpdate?(.init(cycleTimes: [], events: [.paused], snapshot: DetectorSnapshot(), gapBoundary: confirmationBase+7))
  confirmationTracker.onUpdate?(.init(cycleTimes: [confirmationBase+8], events: [.cycle], snapshot: DetectorSnapshot()))
  check("sensor gap discards pre-gap fractional credit", restored.stitches == beforeConfirm)
  restored.stopTracking()

  var core = CountingCore()
  for n in 1...3 { check("fraction \(n)", core.cycle(at: Double(n), k: 4) == 0) }
  core.rebase(at: 10)
  check("no stale catch-up", core.cycle(at: 4, k: 4) == 0)
  check("duplicate event rejected", core.cycle(at: 11, k: 4) == 0 && core.cycle(at: 11, k: 4) == 0)
  let restoredCore = try JSONDecoder().decode(CountingCore.self, from: JSONEncoder().encode(core))
  check("core persistence", restoredCore == core)
  core.rebase(at: 20); core.rebase(at: 10)
  check("barrier cannot move backwards", core.barrier == 20)
  check("nonfinite event cannot poison core", core.cycle(at: .infinity,k:4) == 0 && core.lastEvent.isFinite)
  var gapConfig = CycleCounterConfig(); gapConfig.smoothingSamples = 1; gapConfig.gateNeed = 1
  let gapDetector = CycleCounter(config: gapConfig)
  func sample(_ t: Double, _ value: Double) -> MotionSample { MotionSample(timestamp:t,userAcceleration:.zero,rotationRate:SIMD3(value,0,0)) }
  _ = gapDetector.process(sample(1,0)); _ = gapDetector.process(sample(1.02,4))
  check("gap cannot complete historical peak", !gapDetector.process(sample(10,0)).contains(.cycle))
  _ = gapDetector.process(sample(10.02,4)); _ = gapDetector.process(sample(10.04,0))
  check("new post-gap peak works", gapDetector.snapshot.confirmedCycles == 1)
  gapDetector.reset()
  check("reset clears candidate diagnostics", gapDetector.lastCandidateTime == nil && gapDetector.candidateDecision == nil)

  var learner = Personalization()
  learner.assess(); check("insufficient evidence does not promote", learner.version == 0)
  for n in 0..<4 {
   learner.add(CalibrationSegment(session: "session-\(n)", wrist: "right", duration: 300, cycles: 120, count: 40, evidenceIDs: ["e\(n)"]))
  }
  learner.assess(); check("held-out improvement promotes bounded candidate", learner.version == 1 && learner.active >= 3.4*0.95 && learner.active < 3.4)
  let promotedVersion = learner.version
  learner.assess(); check("same evidence cannot repeatedly promote", learner.version == promotedVersion)
  learner.invalidate("e1"); check("undo training rolls back", learner.active == 3.4)
  let encoded = try JSONEncoder().encode(learner)
  let decodedLearner = try JSONDecoder().decode(Personalization.self, from: encoded)
  check("personalization persists", decodedLearner.active == learner.active)
  learner.reset(); check("reset learning independent of recipe", learner.active == 3.4 && restored.stitches == count+8)

  let pattern = try JSONDecoder().decode(Pattern.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
  let r = pattern.round(num: 29)!
  check("round 29 is chart row 10", r.chartRow == 10)
  check("next 41 white 1/4", r.runInfo(at: 40)!.run.color == "white" && r.runInfo(at: 40)!.position == 1 && r.runInfo(at: 40)!.run.count == 4)
  check("next 45 red 1/5", r.runInfo(at: 44)!.run.color == "red" && r.runInfo(at: 44)!.run.count == 5)
  var position = RecipePosition(round: 29, completed: 99)
  _ = position.move(2, firstRound: 1, autoAdvance: true, target: { pattern.round(num: $0)?.count ?? 0 })
  _ = position.move(-1, firstRound: 1, autoAdvance: true, target: { pattern.round(num: $0)?.count ?? 0 })
  check("cross-round undo keeps later stitch", position == RecipePosition(round: 30, completed: 0))
  let lastRound = pattern.rounds.last!
  restored.setPosition(round: lastRound.num, nextStitch: lastRound.count+1)
  restored.newRow()
  check("next row cannot escape final pattern round", restored.rows == lastRound.num && restored.stitchesInRow == lastRound.count)
  restored.setPosition(round: 33, nextStitch: 11)
  let savedRound = restored.rows
  let savedPosition = restored.stitchesInRow
  restored.finishSession()
  check("saving session preserves recipe position", restored.rows == savedRound && restored.stitchesInRow == savedPosition && restored.stitches == 0)
  restored.resetCounts()
  check("explicit reset still resets recipe", restored.stitchesInRow == 0 && restored.rows == 1)



  let recorder = MotionRecorder(settings: settings, k: 3.4)
  let motion = CMDeviceMotion()
  let t = ProcessInfo.processInfo.systemUptime
  let testSamples = Int(ProcessInfo.processInfo.environment["RECORDING_TEST_SAMPLES"] ?? "751")!
  for n in 0..<testSamples { motion.timestamp = t+Double(n)*0.02; motion.rotationRate.x = Double(n); recorder.append(motion, events: [], candidate: nil) }
  let recording = recorder.finish(settings: settings,wrist:.right,systemWrist:.left,estimatedStitches:0,trueStitches:nil,note:"test")
  let url = try RecordingStore.save(recording)
  let raw = try JSONSerialization.jsonObject(with: Data(contentsOf:url)) as! [String:Any]
  check("spool export preserves every sample", (raw["t"] as! [Double]).count == testSamples && (raw["gx"] as! [Double]).last == Double(testSamples-1))
  check("unknown truth remains unknown", (raw["meta"] as! [String:Any])["trueStitches"] == nil)
  check("quaternion survives spool export", (raw["qw"] as! [Double]).count == testSamples && (raw["qw"] as! [Double]).last == 1)
  check("detector configuration captured at start", (raw["meta"] as! [String:Any])["detectorConfiguration"] != nil)
  check("final metadata survives independently of export", FileManager.default.fileExists(atPath: recording.rawChunkPaths[0].deletingLastPathComponent().appendingPathComponent("final-meta.json").path))
  let savedBytes = try Data(contentsOf: url)
  var rejectedOverwrite = false
  do { _ = try RecordingStore.save(recording) } catch { rejectedOverwrite = true }
  check("repeat save never overwrites recording", rejectedOverwrite && (try? Data(contentsOf: url)) == savedBytes)
  var direct = recording; direct.rawChunkPaths = []; direct.meta.recordingID = UUID().uuidString
  let directURL = try RecordingStore.save(direct)
  let directBytes = try Data(contentsOf: directURL)
  rejectedOverwrite = false
  do { _ = try RecordingStore.save(direct) } catch { rejectedOverwrite = true }
  check("nonspooled save also preserves existing file", rejectedOverwrite && (try? Data(contentsOf: directURL)) == directBytes)
  let interrupted = MotionRecorder(settings: settings, k: 3.4)
  for n in 0..<250 { motion.timestamp = ProcessInfo.processInfo.systemUptime+Double(n)*0.02; interrupted.append(motion, events: [], candidate: nil) }
  interrupted.logCounter(kind: "stop", round: 33, stitchInRow: 0, stitches: 120)
  let interruptedRecording = interrupted.finish(settings: settings, wrist: .right, systemWrist: .left, estimatedStitches: 120, trueStitches: nil, note: "interrupted export test")
  check("startup recovery succeeds", RecordingStore.recoverFinishedExports().isEmpty)
  let recoveredList = RecordingStore.list()
  let recoveredURL = recoveredList.first { $0.url.lastPathComponent.contains(String(interruptedRecording.meta.recordingID!.prefix(8))) }!.url
  let recoveredData = try JSONDecoder.withISO8601.decode(MotionRecording.self, from: Data(contentsOf: recoveredURL))
  check("recovery preserves full-checkpoint stop event", recoveredData.t.count == 250 && recoveredData.counterEvents?.last?.kind == "stop")
  check("recovery is idempotent", RecordingStore.recoverFinishedExports().isEmpty && RecordingStore.list().count == recoveredList.count)
  var shadowConfig = ShadowConfiguration(); shadowConfig.mode = "research"
  shadowConfig.onset = 1; shadowConfig.minimumIntegral = 0.2; shadowConfig.minimumDuration = 0.1
  shadowConfig.releaseDuration = 0.1
  func shadowSequence(_ detector: ShadowDetector, from base: Double) -> [ShadowEvent] {
      var out: [ShadowEvent] = []
      for n in 0..<120 {
          let value: Double = n < 20 ? 3 : n < 40 ? -3 : n < 60 ? 3 : 0
          if let e = detector.process(sample(base+Double(n)*0.02,value), gravity: SIMD3(0,0,-1)) { out.append(e) }
      }
      return out
  }
  let disabledShadow = ShadowDetector()
  check("unqualified shadow never predicts", shadowSequence(disabledShadow,from:0).isEmpty)
  let researchShadow = ShadowDetector(configuration: shadowConfig)
  let shadowResult = shadowSequence(researchShadow,from:0)
  check("direction sequence requires observed release", shadowResult.filter { $0.kind == "prediction" }.count == 1 && shadowResult.first!.decisionTime > 1.2)
  let duplicateShadow = ShadowDetector(configuration: shadowConfig)
  _ = shadowSequence(duplicateShadow,from:0)
  check("shadow rejects old sample", duplicateShadow.process(sample(1,3),gravity:SIMD3(0,0,-1)) == nil)
  _ = duplicateShadow.cancel(at:10,reason:"correction")
  check("shadow correction establishes barrier", duplicateShadow.process(sample(9,3),gravity:SIMD3(0,0,-1)) == nil)
  let gapShadow = ShadowDetector(configuration: shadowConfig)
  _ = gapShadow.process(sample(1,3),gravity:SIMD3(0,0,-1))
  check("shadow gap cancels rather than counts", gapShadow.process(sample(3,0),gravity:SIMD3(0,0,-1))?.reason == "sensor-gap")
  let invalidShadow = ShadowDetector(configuration: shadowConfig)
  _ = invalidShadow.process(sample(1,3),gravity:SIMD3(0,0,-1))
  check("invalid sensor cancels shadow", invalidShadow.process(sample(1.02,.nan),gravity:SIMD3(0,0,-1))?.reason == "invalid-sample")
  let orderedShadow = ShadowDetector(configuration: shadowConfig)
  _ = orderedShadow.process(sample(2,3),gravity:SIMD3(0,0,-1))
  check("out of order cancels incomplete sequence", orderedShadow.process(sample(1.9,3),gravity:SIMD3(0,0,-1))?.reason == "out-of-order-sample")
  var expiryConfig = shadowConfig; expiryConfig.maximumDuration = 0.3
  check("expiry never emits a stitch", shadowSequence(ShadowDetector(configuration: expiryConfig),from:0).allSatisfy { $0.kind != "prediction" })
  for reason in ["correction", "haptic-stitch", "stop", "colour-change"] {
      let d = ShadowDetector(configuration: shadowConfig)
      for n in 0..<60 { _ = d.process(sample(Double(n)*0.02,n < 20 ? 3 : n < 40 ? -3 : 3),gravity:SIMD3(0,0,-1)) }
      _ = d.cancel(at:1.2,reason:reason)
      var predictions = 0
      for n in 61..<100 { if d.process(sample(Double(n)*0.02,0),gravity:SIMD3(0,0,-1))?.kind == "prediction" { predictions += 1 } }
      check("\(reason) cannot release a previous stitch", predictions == 0)
  }
  var shadowSettings = settings; shadowSettings.yarnCondition = .oneYarn
  let shadowRec = MotionRecorder(settings: shadowSettings,k:3.4)
  for n in 0..<250 {
      motion.timestamp = ProcessInfo.processInfo.systemUptime+Double(n)*0.02
      shadowRec.append(motion,events:[],candidate:nil,shadow:n == 0 ? [ShadowEvent(eventTime:motion.timestamp,decisionTime:motion.timestamp,kind:"boundary",reason:"test",phase:"instrumentation-only")] : [])
  }
  shadowRec.logShadow(ShadowEvent(eventTime:motion.timestamp,decisionTime:motion.timestamp,kind:"boundary",reason:"stop",phase:"instrumentation-only"))
  let shadowRecording = shadowRec.finish(settings:settings,wrist:.right,systemWrist:.left,estimatedStitches:0,trueStitches:nil,note:"shadow recovery")
  check("shadow recording recovery succeeds", RecordingStore.recoverFinishedExports().isEmpty)
  let shadowURL = RecordingStore.list().first { $0.url.lastPathComponent.contains(String(shadowRecording.meta.recordingID!.prefix(8))) }!.url
  let recoveredShadow = try JSONDecoder.withISO8601.decode(MotionRecording.self,from:Data(contentsOf:shadowURL))
  check("shadow checkpoint and final boundary survive recovery", recoveredShadow.shadowEvents?.map(\.reason) == ["test","stop"])
  check("shadow schema records qualification and initial yarn", recoveredShadow.meta.version == 7 && recoveredShadow.meta.shadowConfiguration?.mode == "instrumentation-only" && recoveredShadow.meta.yarnCondition == .oneYarn)
  let oldSettings = try JSONDecoder().decode(Settings.self,from:Data("{}".utf8))
  check("old settings decode unknown yarn", oldSettings.yarnCondition == .unknown)
  print("\(checks) production checks passed")
 }
}
private extension JSONDecoder {
 static var withISO8601: JSONDecoder { let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601; return decoder }
}
