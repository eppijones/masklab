import Foundation
import Observation
import WatchKit

/// Hele app-tilstanden: teller, innstillinger, opptak og historikk.
///
/// Telleren er et *anslag*: `CycleCounter` teller kraftige vri-sykler i
/// håndleddet, og modellen deler på «sykler per maske» for håndleddet klokka
/// sitter på. Manuelle justeringer og «Lær av raden» korrigerer anslaget.
@MainActor
@Observable
final class CounterModel {
    enum Status: Equatable {
        case idle          // teller ikke
        case listening     // teller, men ingen bevegelse enda
        case crocheting    // sykler registreres
        case paused        // teller, men hendene har vært stille
    }

    // MARK: - Observerbar tilstand

    private(set) var isTracking = false
    private(set) var status: Status = .idle
    private(set) var stitches = 0
    private(set) var rows = 1
    private(set) var stitchesInRow = 0
    private(set) var sessionStarted: Date?
    private(set) var snapshot = DetectorSnapshot()
    private(set) var workoutState: WorkoutKeeper.State = .idle
    private(set) var history: [SessionRecord] = []
    private(set) var canUndo = false
    /// Bekreftede vri-sykler i økten.
    private(set) var cycles = 0
    /// Sykler ved starten av gjeldende rad – brukes av «Lær av raden».
    private(set) var cyclesAtRowStart = 0
    /// Resultatet av siste «Lær av raden», til visning.
    private(set) var lastLearnedRatio: Double?

    // Opptak av rådata (til analyse og tuning av detektoren)
    private(set) var isRecording = false
    private(set) var recordingStarted: Date?
    private(set) var recordingMarkers = 0
    private(set) var recordingDetected = 0
    /// Stoppet opptak som venter på at brukeren angir riktig antall masker.
    private(set) var pendingRecording: MotionRecorder?
    private(set) var recordings: [RecordingStore.Info] = []
    private(set) var recordingError: String?
    /// Dette opptaket startet sammen med Start (ikke fra Opptak-fanen).
    private(set) var recordingAutomatic = false

    var settings: Settings {
        didSet {
            guard settings != oldValue else { return }
            settings.save()
            logCounter("settings-change")
            confirmation = nil
            tracker.update(config: settings.detectorConfig)
            if settings.patternId != oldValue.patternId { loadPattern() }
        }
    }

    // MARK: - Oppskrift

    /// Aktiv oppskrift. `rows` er da rundenummeret i oppskriften.
    private(set) var pattern: Pattern?

    var currentRound: Pattern.Round? { pattern?.round(num: rows) }

    /// Masker i gjeldende rad/runde før den er full. 0 = ikke satt.
    var rowTarget: Int { currentRound?.count ?? settings.stitchesPerRow }

    /// Neste maske som skal hekles (0-basert indeks i runden).
    var nextStitchIndex: Int { stitchesInRow }

    /// Farge på neste maske.
    var nextColor: String? { currentRound?.color(at: nextStitchIndex) }

    /// Løpet neste maske hører til («3 hvite 3–5, 1 av 3»).
    var nextRun: Pattern.Round.RunInfo? { currentRound?.runInfo(at: nextStitchIndex) }

    /// Hopp til en bestemt runde og maske (1-basert: maska du skal hekle nå).
    func setPosition(round: Int, nextStitch: Int) {
        correctionUndo.removeAll()
        confirmation = nil
        pushUndo()
        rebaseBaselineOnly()
        rows = max(1, round)
        let target = rowTarget
        stitchesInRow = max(0, min(target > 0 ? target : Int.max, nextStitch - 1))
        cyclesAtRowStart = cycles
        logCounter("set")
        Haptics.adjust()
        persistActive()
    }

    /// Innstillinger (ikke posisjon). Posisjon settes av `applyRecoveryIfNeeded`.
    private func migrateSettingsIfNeeded() {
        var s = settings
        guard s.version < Settings.currentVersion else { return }
        s.patternId = s.patternId ?? "ro-ro-ro"
        s.autoRecord = true
        s.minStitchInterval = 5
        s.physicalWrist = .right
        s.cyclesPerStitchRight = 3.40
        s.cyclesPerStitchLeft = 3.40
        s.version = Settings.currentVersion
        settings = s
        loadPattern()
    }

    /// Én-gangs recovery mens telling er stoppet. Overstyrer ikke senere fremdrift.
    private func applyRecoveryIfNeeded() {
        guard !isTracking else { return }
        guard !PositionRecovery.hasApplied(AppIdentity.recoveryId) else { return }
        loadPattern()
        // Existing active progress is authoritative; recovery is only for a fresh install.
        guard store.loadActive() == nil else {
            PositionRecovery.markApplied(AppIdentity.recoveryId)
            return
        }
        rows = 29
        stitchesInRow = 40
        cycles = 0
        cyclesAtRowStart = 0
        autoCredited = 0
        if sessionStarted == nil { sessionStarted = Date() }
        PositionRecovery.markApplied(AppIdentity.recoveryId)
        persistActive()
    }

    private func loadPattern() {
        pattern = settings.patternId.flatMap { Pattern.load(id: $0) }
        if let p = pattern, p.round(num: rows) == nil, let first = p.rounds.first {
            rows = first.num
            stitchesInRow = 0
            cyclesAtRowStart = cycles
            persistActive()
        }
    }

    var motionAvailable: Bool { tracker.isAvailable }

    /// Systemets wristLocation – kan være feil mot fysisk plassering.
    var systemWrist: Wrist {
        WKInterfaceDevice.current().wristLocation == .left ? .left : .right
    }

    /// Aktiv profil: eksplisitt fysisk håndledd overstyrer systemet.
    var wrist: Wrist { .right }

    var cyclesPerStitch: Double { wrist.rawValue == learning.wrist ? learning.active : settings.cyclesPerStitch(for: wrist) }

    /// Sykler i gjeldende rad.
    var cyclesInRow: Int { max(0, cycles - cyclesAtRowStart) }

    /// Har automatikken bidratt til tallet i denne økten?
    var isEstimate: Bool { autoCredited > 0 }

    // MARK: - Interne deler

    let sync = WatchSync()
    private var applyingSync = false
    private var syncLastPosition: SharedPosition?
    var sharedPosition: SharedPosition { SharedPosition(patternId: settings.patternId ?? "ro-ro-ro", round: rows, completed: stitchesInRow) }
    private(set) var feedback = ""
    private(set) var learning = Personalization()
    private var core = CountingCore()
    private var correctionUndo: [CorrectionUndo] = []
    private var recentCycles: [Double] = []
    private var interactions: [Double] = []
    private var hapticInteractions: [Double] = []
    private let undoURL: URL
    private let runtimeURL: URL
    private var confirmation: (time: Double, cycles: Int, stitches: Int, ids: [String])?
    private var sessionID = UUID().uuidString
    private let learningURL: URL
    private func saveLearning() {
        do { try JSONEncoder().encode(learning).write(to: learningURL, options: .atomic) }
        catch { recordingError = "Kunne ikke lagre læring: \(error.localizedDescription)" }
    }
    private let tracker: MotionTracker
    private let workout = WorkoutKeeper()
    private let store: SessionStore
    private var undoStack: [(stitches: Int, rows: Int, stitchesInRow: Int)] = []
    private var recorder: MotionRecorder?
    /// Hvor mange masker automatikken har lagt til så langt (= round(cycles / k)).
    private var autoCredited = 0
    private var recordingStartRound = 0
    private var recordingStartStitchInRow = 0
    private var recordingStartStitches = 0
    private var trackingStartStitches = 0
    private var recordingAutoCount = 0
    private var currentSensorEventTime: Double?
    private var crownGroupId: String?
    private var crownGroupStarted: Date?
    private var crownFlushWork: DispatchWorkItem?

    init(directory: URL? = nil, enableSync: Bool = true) {
        let directory = directory ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        store = SessionStore(directory: directory)
        learningURL = directory.appendingPathComponent("personalization-v1.json")
        undoURL = directory.appendingPathComponent("correction-undo-v1.json")
        runtimeURL = directory.appendingPathComponent("runtime-status.json")
        let loaded = Settings.load()
        settings = loaded
        tracker = MotionTracker(config: loaded.detectorConfig)
        if let data = try? Data(contentsOf: learningURL), let saved = try? JSONDecoder().decode(Personalization.self, from: data) { learning = saved }
        if let data = try? Data(contentsOf: undoURL), let saved = try? JSONDecoder().decode([CorrectionUndo].self, from: data) {
            correctionUndo = saved; canUndo = !saved.isEmpty
        }
        Haptics.onPlay = { [weak self] name in self?.noteInteraction("haptic-" + name) }
        history = store.history
        recordings = RecordingStore.list()

        if let active = store.loadActive() {
            sessionStarted = active.started
            stitches = active.stitches
            rows = active.rows
            stitchesInRow = active.stitchesInRow
            cycles = active.cycles ?? 0
            cyclesAtRowStart = active.cyclesAtRowStart ?? 0
            autoCredited = active.autoCredited ?? 0
        }

        syncLastPosition = sharedPosition
        loadPattern()
        migrateSettingsIfNeeded()
        applyRecoveryIfNeeded()
        tracker.onUpdate = { [weak self] update in
            self?.handle(update)
        }
        sync.onRemote = { [weak self] position in
            guard let self, position != self.sharedPosition,
                position.patternId == "ro-ro-ro", let round = self.pattern?.round(num: position.round),
                (0...round.count).contains(position.completed) else { return }
            self.applyingSync = true
            self.setPosition(round: position.round, nextStitch: position.completed + 1)
            self.logCounter("remote-position")
            self.syncLastPosition = position
            self.applyingSync = false
            self.feedback = "Posisjon fra nettsiden"
        }
        if enableSync { sync.start() }
        persistRuntime()
        workout.onStateChange = { [weak self] state in
            self?.workoutState = state
        }
        Task { [weak self] in
            let failures = await Task.detached(priority: .utility) { RecordingStore.recoverFinishedExports() }.value
            guard let self else { return }
            self.recordings = RecordingStore.list()
            if !failures.isEmpty { self.recordingError = "Opptak bevart, eksport må prøves igjen: " + failures.joined(separator: "; ") }
        }
    }

    // MARK: - Start / stopp

    func toggleTracking() {
        if isTracking { stopTracking() } else { startTracking() }
    }

    func startTracking() {
        guard !isTracking, recorder == nil, pendingRecording == nil else { return }
        guard motionAvailable else {
            Haptics.failure()
            return
        }
        if sessionStarted == nil { sessionStarted = Date() }
        isTracking = true
        status = .listening
        sessionID = UUID().uuidString
        confirmation = nil
        tracker.cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "counter-rebase")
        core.rebase(at: ProcessInfo.processInfo.systemUptime)
        trackingStartStitches = stitches
        beginRecording(automatic: true)
        noteInteraction("ui-start")
        tracker.start()
        Haptics.started()
        persistActive()

        if settings.keepAwake {
            Task { await workout.start() }
        }
    }

    func stopTracking() {
        guard isTracking else { return }
        noteInteraction("ui-stop")
        flushCrownGroup()
        Haptics.stopped()
        if isRecording {
            if recordingAutomatic {
                finishAutomaticRecording()
            } else {
                stopRecording()
            }
        }
        flushCrownGroup()
        confirmation = nil
        learning.assess()
        saveLearning()
        isTracking = false
        status = .idle
        tracker.stop()
        workout.stop()
        persistActive()
    }

    /// Save session totals while preserving the active recipe position.
    func finishSession() {
        stopTracking()
        if let started = sessionStarted, stitches > 0 {
            let record = SessionRecord(started: started, ended: Date(), stitches: stitches, rows: rows, period: nil)
            store.append(record)
            history = store.history
        }
        resetCounts(preserveRecipe: pattern != nil)
    }

    /// Nullstill teller uten å lagre.
    func resetCounts(preserveRecipe: Bool = false) {
        stitches = 0
        if !preserveRecipe {
            rows = pattern?.rounds.first?.num ?? 1
            stitchesInRow = 0
        }
        cycles = 0
        cyclesAtRowStart = 0
        autoCredited = 0
        sessionStarted = isTracking ? Date() : nil
        undoStack.removeAll()
        correctionUndo.removeAll()
        confirmation = nil
        tracker.cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "counter-rebase")
        core.rebase(at: ProcessInfo.processInfo.systemUptime)
        canUndo = false
        tracker.resetDetector()
        persistActive()
    }

    // MARK: - Manuelle justeringer

    func addStitch() { adjust(by: 1) }
    func removeStitch() { adjust(by: -1) }

    /// Main-actor ordering defines the order of taps and delivered autoevents.
    func adjust(by delta: Int) {
        if delta == 0 { confirmCount(); return }
        let before = stitches
        let applied = movePosition(by: delta)
        guard applied != 0 else { return }
        rebaseBaselineOnly()
        if crownGroupId == nil { crownGroupId = UUID().uuidString }
        let id = UUID().uuidString
        let evidence = CorrectionEvidence(id: id, session: sessionID,
            time: ProcessInfo.processInfo.systemUptime, delta: applied, before: before,
            after: stitches, group: crownGroupId!, tracking: isTracking)
        learning.capture(evidence)
        undoStack.removeAll()
        correctionUndo.append(CorrectionUndo(id: id, delta: applied, totalDelta: stitches-before))
        if correctionUndo.count > 50 { correctionUndo.removeFirst() }
        canUndo = true
        logManual(before: before)
        noteInteraction("ui-correction")
        feedback = applied > 0 ? "+\(applied) rettet" : "\(applied) rettet"
        let message = feedback
        Task { [weak self] in
            try? await Task.sleep(for: .seconds(2))
            if self?.feedback == message { self?.feedback = "" }
        }
        saveLearning()
        persistActive()
    }

    /// Recipe position and session total are different coordinates.
    @discardableResult
    private func movePosition(by delta: Int) -> Int {
        var position = RecipePosition(round: rows, completed: stitchesInRow)
        var boundedDelta = delta
        if delta > 0, let last = pattern?.rounds.last, rows == last.num {
            boundedDelta = min(delta, max(0, last.count - stitchesInRow))
        }
        let applied = position.move(boundedDelta, firstRound: pattern?.rounds.first?.num ?? 1,
            autoAdvance: pattern != nil || settings.autoNewRow,
            target: { pattern?.round(num: $0)?.count ?? settings.stitchesPerRow })
        stitches = max(0, stitches + applied)
        if let last = pattern?.rounds.last, position.round > last.num {
            position.round = last.num; position.completed = last.count
        }
        rows = position.round; stitchesInRow = position.completed
        return applied
    }

    private func noteInteraction(_ name: String) {
        let now = ProcessInfo.processInfo.systemUptime
        if name.hasPrefix("haptic-") {
            hapticInteractions.append(now)
            hapticInteractions.removeAll { now - $0 > 1202 }
            if hapticInteractions.count > 512 { hapticInteractions.removeFirst(hapticInteractions.count - 512) }
        } else {
            interactions.append(now)
            interactions.removeAll { now - $0 > 1202 }
            if interactions.count > 512 { interactions.removeFirst(interactions.count - 512) }
        }
        tracker.cancelShadow(at: now, reason: name)
        logCounter(name)
    }

    func confirmCount() {
        flushCrownGroup()
        rebaseBaselineOnly()
        let now = ProcessInfo.processInfo.systemUptime
        noteInteraction("ui-confirm")
        logCounter("confirm-explicit", beforeStitches: stitches)
        if isTracking {
            if let anchor = confirmation {
                let ev = learning.evidence.filter { $0.session == sessionID && $0.time >= anchor.time }
                // Bulk setup and undone corrections cannot become training constraints.
                let candidates = recentCycles.filter { $0 >= anchor.time && $0 <= now }
                let groups = Dictionary(grouping: ev, by: \.group)
                let bulk = groups.values.contains { $0.count >= 3 }
                let nearUI = candidates.contains { t in interactions.contains { abs($0-t) <= 0.8 } }
                let nearHaptic = candidates.contains { t in hapticInteractions.contains { abs($0-t) <= 0.8 } }
                let contaminated = nearUI || nearHaptic
                if nearUI { logCounter("learning-flag-ui-proximity") }
                if nearHaptic { logCounter("learning-flag-haptic-proximity") }
                if now-anchor.time <= 1200 && !contaminated && !bulk && ev.allSatisfy({ $0.valid && $0.tracking && abs($0.delta) == 1 }) {
                    learning.add(CalibrationSegment(session: sessionID, wrist: wrist.rawValue,
                        duration: now-anchor.time, cycles: cycles-anchor.cycles,
                        count: stitches-anchor.stitches, evidenceIDs: ev.map(\.id)))
                    logCounter("learning-assessed-" + learning.reason)
                } else {
                    let reason = contaminated ? "interaction-proximity" : bulk ? "bulk-correction" : now-anchor.time > 1200 ? "segment-too-long" : "invalid-correction"
                    learning.reason = "Segment avvist: " + reason
                    logCounter("learning-rejected-" + reason)
                }
            }
            confirmation = (now, cycles, stitches, [])
        }
        feedback = "Antall bekreftet"
        saveLearning()
    }

    func resetLearning() {
        guard !isTracking else { return }
        learning.reset(); saveLearning(); rebaseBaselineOnly()
    }
    func rollbackLearning() {
        guard !isTracking else { return }
        learning.rollback(); saveLearning(); rebaseBaselineOnly()
    }

    func newRow() {
        if let last = pattern?.rounds.last, rows >= last.num { return }
        confirmation = nil
        pushUndo()
        rebaseBaselineOnly()
        rows += 1
        stitchesInRow = 0
        cyclesAtRowStart = cycles
        logCounter("row")
        Haptics.newRow()
        persistActive()
    }

    func undo() {
        if let correction = correctionUndo.popLast() {
            let total = stitches
            movePosition(by: -correction.delta)
            stitches = max(0, total - correction.totalDelta)
            learning.invalidate(correction.id)
            confirmation = nil
            saveLearning()
            feedback = "Rettelse angret"
        } else if let last = undoStack.popLast() {
            // Setup operations invalidate training and cannot erase later autoevents.
            stitches = last.stitches
            rows = last.rows
            stitchesInRow = last.stitchesInRow
            confirmation = nil
        } else { return }
        canUndo = !correctionUndo.isEmpty || !undoStack.isEmpty
        rebaseBaselineOnly()
        logCounter("undo")
        persistActive()
    }

    /// Flytt automatikkens baseline. Endrer ikke k – kronegrupper skal ikke trene.
    private func rebaseBaselineOnly() {
        autoCredited = Int(Double(cycles) / max(0.5, cyclesPerStitch))
        tracker.cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "counter-rebase")
        core.rebase(at: ProcessInfo.processInfo.systemUptime)
    }

    private func logManual(before: Int) {
        if crownGroupId == nil {
            crownGroupId = UUID().uuidString
            crownGroupStarted = Date()
        }
        logCounter("manual", beforeStitches: before, groupId: crownGroupId)
        crownFlushWork?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.flushCrownGroup()
        }
        crownFlushWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: work)
    }

    private func flushCrownGroup() {
        guard crownGroupId != nil else { return }
        logCounter("correction-episode-closed", beforeStitches: stitches, groupId: crownGroupId)
        crownGroupId = nil
        crownGroupStarted = nil
        crownFlushWork = nil
    }

    // MARK: - Lær av raden

    /// Correct position now; only explicit, sufficiently long confirmed
    /// segments can later contribute to bounded calibration at a safe stop.
    func learnFromRow(actual: Int) {
        guard actual > 0 else { return }
        adjust(by: actual - stitchesInRow)
        confirmCount()
    }

    // MARK: - Opptak

    func startRecording() {
        if !isTracking { startTracking() }
        if !isRecording { beginRecording(automatic: false) }
    }

    private func beginRecording(automatic: Bool) {
        guard !isRecording, recorder == nil, pendingRecording == nil else { return }
        guard isTracking else { return }
        let rec = MotionRecorder(settings: settings, k: cyclesPerStitch, core: core, cycles: cycles, sessionID: sessionID, modelVersion: learning.version)
        recorder = rec
        isRecording = true
        recordingAutomatic = automatic
        recordingMarkers = 0
        recordingDetected = 0
        recordingError = nil
        recordingStarted = rec.startedAt
        recordingStartRound = rows
        recordingStartStitchInRow = stitchesInRow
        recordingStartStitches = stitches
        recordingAutoCount = 0
        rec.logCounter(kind: "start", round: rows, stitchInRow: stitchesInRow, stitches: stitches)
        tracker.setRecorder(rec) {
            guard !automatic else { return }
            Haptics.started()
        }
    }

    /// Brukeren markerer et tidspunkt – f.eks. «rad ferdig» eller hver maske.
    func addRecordingMarker() {
        guard isRecording, let rec = recorder else { return }
        rec.addMarker()
        recordingMarkers = rec.markerCount
        Haptics.newRow()
    }

    func stopRecording() {
        guard isRecording, let rec = recorder else { return }
        tracker.cancelShadow(at: ProcessInfo.processInfo.systemUptime, reason: "recording-stop")
        isRecording = false
        tracker.setRecorder(nil) { [weak self] in
            guard let self else { return }
            self.recordingDetected = rec.detectedCount
            self.recordingMarkers = rec.markerCount
            self.pendingRecording = rec
            Haptics.stopped()
        }
    }

    /// Lagre det stoppede opptaket med riktig antall masker (nil = vet ikke).
    func saveRecording(trueStitches: Int?) {
        guard let rec = pendingRecording else { return }
        persistRecording(rec, trueStitches: trueStitches)
        pendingRecording = nil
        recorder = nil
        recordingAutomatic = false
    }

    /// Automatic recording never manufactures an independent true count.
    private func finishAutomaticRecording() {
        guard isRecording, let rec = recorder else { return }
        isRecording = false
        tracker.detachRecorder()
        persistRecording(rec, trueStitches: nil)
        recorder = nil
        recordingAutomatic = false
        recordingStarted = nil
    }

    private func makeRecording(_ rec: MotionRecorder, trueStitches: Int?) -> MotionRecording {
        rec.logCounter(kind: "stop", round: rows, stitchInRow: stitchesInRow, stitches: stitches)
        let displayed = max(0, stitches - recordingStartStitches)
        return rec.finish(
            settings: settings, wrist: wrist, systemWrist: systemWrist,
            estimatedStitches: displayed,
            trueStitches: trueStitches, note: patternNote,
            patternId: settings.patternId,
            startRound: recordingStartRound,
            startStitchInRow: recordingStartStitchInRow,
            endRound: rows, endStitchInRow: stitchesInRow,
            autoStitches: recordingAutoCount,
            manualDelta: displayed - recordingAutoCount,
            automatic: recordingAutomatic
        )
    }

    private func saveFinishedRecording(_ recording: MotionRecording) {
        // Export can span many raw chunks. Keep taps and sensor delivery responsive.
        Task { [weak self] in
            let result = await Task.detached(priority: .utility) { () -> Result<[RecordingStore.Info], Error> in
                do {
                    _ = try RecordingStore.save(recording)
                    return .success(RecordingStore.list())
                } catch { return .failure(error) }
            }.value
            guard let self else { return }
            switch result {
            case .success(let list): self.recordings = list
            case .failure(let error): self.recordingError = error.localizedDescription
            }
        }
    }
    private func persistRecording(_ rec: MotionRecorder, trueStitches: Int?) {
        saveFinishedRecording(makeRecording(rec, trueStitches: trueStitches))
    }
    /// Limit event/index memory to 30 minutes while raw sampling continues.
    private func rotateRecording() {
        guard recordingAutomatic, let old = recorder else { return }
        tracker.detachRecorder()
        let completed = makeRecording(old, trueStitches: nil)
        recorder = nil; isRecording = false
        beginRecording(automatic: true)
        saveFinishedRecording(completed)
    }

    private var patternNote: String? {
        guard pattern != nil else { return nil }
        return "RO RO RO runde \(recordingStartRound) maske \(recordingStartStitchInRow + 1) → runde \(rows) maske \(stitchesInRow)"
    }

    private func logCounter(_ kind: String, beforeStitches: Int? = nil, groupId: String? = nil) {
        recorder?.logCounter(kind: kind, round: rows, stitchInRow: stitchesInRow, stitches: stitches,
                             beforeStitches: beforeStitches, groupId: groupId, eventTime: kind == "auto" ? currentSensorEventTime : nil, parameters: kind == "settings-change" ? settings : nil)
    }

    func discardRecording() {
        pendingRecording = nil
        recorder = nil
    }

    func deleteRecording(_ info: RecordingStore.Info) {
        RecordingStore.delete(info)
        recordings = RecordingStore.list()
    }

    // MARK: - Historikk

    func delete(_ record: SessionRecord) {
        store.delete(record)
        history = store.history
    }

    func clearHistory() {
        store.clearHistory()
        history = store.history
    }

    // MARK: - Hendelser fra detektoren

    private func handle(_ update: MotionTracker.Update) {
        snapshot = update.snapshot
        guard isTracking else { return }
        if let boundary = update.gapBoundary { core.rebase(at: boundary); confirmation = nil; logCounter("sensor-gap") }
        if isRecording, let rec = recorder { recordingDetected = rec.detectedCount }

        for eventTime in update.cycleTimes {
            guard eventTime > core.barrier, eventTime > core.lastEvent else { continue }
            cycles += 1
            recentCycles.append(eventTime)
            recentCycles.removeAll { eventTime - $0 > 1202 }
            if recentCycles.count > 2048 { recentCycles.removeFirst() }
            status = .crocheting
            if core.cycle(at: eventTime, k: cyclesPerStitch) > 0 {
                if let round = currentRound, stitchesInRow >= round.count, pattern?.round(num: rows + 1) == nil { continue }
                autoCredited += 1
                recordingAutoCount += 1
                // Generic setup undo cannot erase valid later automatic progress.
                undoStack.removeAll()
                canUndo = !correctionUndo.isEmpty
                currentSensorEventTime = eventTime
                registerStitch(manual: false)
                currentSensorEventTime = nil
            }
        }
        if !update.snapshot.isActive && status == .crocheting { status = .paused }
        if !update.cycleTimes.isEmpty { persistActive() }
        if let rec = recorder {
            if let error = rec.error { recordingError = error; stopTracking() }
            else if rec.sampleCount >= 90_000 { rotateRecording() }
        }
    }

    private func registerStitch(manual: Bool) {
        if let round = currentRound, stitchesInRow >= round.count, pattern?.round(num: rows + 1) == nil { return }
        stitches += 1
        stitchesInRow += 1

        let target = rowTarget
        let hasPattern = currentRound != nil
        if target > 0 && stitchesInRow == target {
            Haptics.rowComplete()
            if (settings.autoNewRow && !hasPattern) || (hasPattern && pattern?.round(num: rows + 1) != nil) {
                rows += 1
                stitchesInRow = 0
                cyclesAtRowStart = cycles
            }
        } else if hasPattern, settings.hapticColorChange,
                  let round = currentRound,
                  let next = round.color(at: stitchesInRow),
                  let done = round.color(at: stitchesInRow - 1),
                  next != done {
            Haptics.colorChange()
        } else if settings.hapticEveryTen && stitches % 10 == 0 {
            Haptics.tenStitches()
        } else if settings.hapticPerStitch || manual {
            Haptics.stitch()
        }
        logCounter(manual ? "manual" : "auto")
        persistActive()
    }

    private func pushUndo() {
        undoStack.append((stitches, rows, stitchesInRow))
        if undoStack.count > 50 { undoStack.removeFirst() }
        canUndo = true
    }

    private func persistRuntime() {
        let status: [String: Any] = ["build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "test",
            "algorithm": AppIdentity.algorithmVersion, "isTracking": isTracking, "isRecording": isRecording,
            "shadowMode": ShadowConfiguration().mode, "shadowVersion": ShadowConfiguration().version,
            "yarnCondition": settings.yarnCondition.rawValue,
            "round": rows, "completed": stitchesInRow, "next": nextStitchIndex + 1,
            "nextColor": nextColor ?? "unknown", "runPosition": nextRun?.position ?? 0,
            "runCount": nextRun?.run.count ?? 0, "physicalWrist": wrist.rawValue,
            "systemWrist": systemWrist.rawValue, "k": cyclesPerStitch,
            "learningVersion": learning.version, "learningReason": learning.reason,
            "writtenAt": ISO8601DateFormatter().string(from: Date())]
        do { try JSONSerialization.data(withJSONObject: status, options: .sortedKeys).write(to: runtimeURL, options: .atomic) }
        catch { recordingError = error.localizedDescription }
    }
    private func persistActive() {
        persistRuntime()
        if !applyingSync && settings.patternId == "ro-ro-ro" && sync.linked {
            if syncLastPosition != sharedPosition { syncLastPosition = sharedPosition; sync.local(sharedPosition) }
        } else { syncLastPosition = sharedPosition }
        do { try JSONEncoder().encode(correctionUndo).write(to: undoURL, options: .atomic) }
        catch { recordingError = error.localizedDescription }
        if let started = sessionStarted, stitches > 0 || stitchesInRow > 0 || isTracking || pattern != nil {
            store.saveActive(ActiveSessionState(started: started, stitches: stitches, rows: rows,
                                                stitchesInRow: stitchesInRow, cycles: cycles,
                                                cyclesAtRowStart: cyclesAtRowStart, autoCredited: autoCredited))
        } else {
            store.saveActive(nil)
        }
    }
}
