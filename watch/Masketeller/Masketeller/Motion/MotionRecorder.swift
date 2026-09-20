import Foundation
import CoreMotion

/// Filformatet for et opptak. Kolonnebasert for å holde JSON-en kompakt.
/// Alle tider er sekunder relativt til `startedAt` (CMDeviceMotion-klokke).
struct MotionRecording: Codable {
    struct Meta: Codable {
        var recordingID: String? = UUID().uuidString
        var version = 7
        var sourceRevision: String? = "local-watch-b58"
        var detectorConfiguration: CycleCounterConfig? = nil
        var shadowConfiguration: ShadowConfiguration? = nil
        var yarnCondition: YarnCondition? = nil
        var modelVersion: Int? = nil
        var timeOriginUptime: Double? = nil
        var build: String? = Bundle.main.infoDictionary?["CFBundleVersion"] as? String
        var startSettings: Settings? = nil
        var startK: Double? = nil
        var startCore: CountingCore? = nil
        var startCycles: Int? = nil
        var sessionID: String? = nil
        var truthProvenance: String? = nil
        var algorithmVersion: String? = AppIdentity.algorithmVersion
        /// Systemets wristLocation, kan avvike fra fysisk plassering.
        var systemWrist: Wrist? = nil
        /// Valgt fysisk håndledd (overstyrer system).
        var chosenWrist: Wrist? = nil
        var displayedStitches: Int? = nil
        var autoStitches: Int? = nil
        var manualDelta: Int? = nil
        var endRound: Int? = nil
        var endStitchInRow: Int? = nil
        var startedAt: Date
        var endedAt: Date
        var sampleRate: Double
        var device: String
        var settings: Settings
        /// Antall masker brukeren faktisk heklet (angitt ved slutt). Nil = ukjent.
        var trueStitches: Int?
        /// Appens anslag for antall masker ved slutten av opptaket.
        var detectedStitches: Int
        /// Bekreftede vri-sykler i opptaket (se `CycleCounter`).
        var cycles: Int? = nil
        /// Sykler per maske appen brukte under opptaket.
        var cyclesPerStitch: Double? = nil
        var wrist: Wrist? = nil
        /// Oppskrift og posisjon ved start (versjon 3).
        var patternId: String? = nil
        var startRound: Int? = nil
        var startStitchInRow: Int? = nil
        /// Startet automatisk sammen med tellingen.
        var automatic: Bool? = nil
        var note: String?
    }

    // Local spool files are deliberately excluded from the exported schema.
    var rawChunkPaths: [URL] = []
    enum CodingKeys: String, CodingKey {
        case shadowEvents
        case meta, t, ax, ay, az, gx, gy, gz, grx, gry, grz, qw, qx, qy, qz
        case detectedStitchTimes, pauseTimes, resumeTimes, markerTimes, counterEvents, candidateEvents
    }
    var shadowEvents: [ShadowEvent]? = nil
    var candidateEvents: [CandidateDecision]? = nil
    var meta: Meta
    /// Tid per prøve, sekunder fra start.
    var t: [Double]
    /// Brukerakselerasjon (g)
    var ax: [Double], ay: [Double], az: [Double]
    /// Rotasjonshastighet (rad/s)
    var gx: [Double], gy: [Double], gz: [Double]
    /// Gravitasjonsvektor (g)
    var grx: [Double], gry: [Double], grz: [Double]
    /// Attitude som kvaternion
    var qw: [Double], qx: [Double], qy: [Double], qz: [Double]
    /// Tidspunkt (s fra start) for bekreftede vri-sykler (versjon 2).
    /// Versjon 1-filer brukte samme felt for «maske» fra den gamle detektoren.
    var detectedStitchTimes: [Double]
    /// Tidspunkt (s fra start) for pause/gjenopptak-hendelser.
    var pauseTimes: [Double]
    var resumeTimes: [Double]
    /// Tidspunkt (s fra start) der brukeren trykket «Markør».
    var markerTimes: [Double]
    /// Alle endringer i telleren (versjon 3): automatiske, manuelle og «sett posisjon».
    /// Manuelle rettelser er fasit for hvor anslaget hadde drevet.
    var counterEvents: [CounterEvent]? = nil
}

struct CounterEvent: Codable, Equatable {
    var t: Double
    /// auto · manual · set · row · learn · undo · confirm · start · stop
    var kind: String
    var round: Int
    var stitchInRow: Int
    var stitches: Int
    var beforeStitches: Int? = nil
    var groupId: String? = nil
    var eventTime: Double? = nil
    var decisionTime: Double? = nil
    var sequence: Int? = nil
    var parameters: Settings? = nil
}

/// Samler rå bevegelsesdata i minnet mens et opptak pågår.
/// Kall `append` fra bevegelseskøen; `addMarker` kan kalles fra hovedtråden
/// (den bruker klokketid som konverteres ved lagring).
final class MotionRecorder {
    private(set) var startedAt = Date()
    private var firstTimestamp: TimeInterval? = ProcessInfo.processInfo.systemUptime
    private let initialSettings: Settings
    private let initialK: Double
    private let initialCore: CountingCore?
    private let initialCycles: Int
    private let modelVersion: Int
    private let sessionID: String?
    private var chunks: [URL] = []
    private var totalSamples = 0
    private var totalDetected = 0
    private var totalMarkers = 0
    private var sequence = 0
    private let recordingID = UUID().uuidString
    private var candidates: [CandidateDecision] = []
    private var shadowEvents: [ShadowEvent] = []
    private var spoolError: String?
    private let spoolDirectory = RecordingStore.directory.appendingPathComponent("partial-" + UUID().uuidString)
    init(settings: Settings, k: Double, core: CountingCore? = nil, cycles: Int = 0, sessionID: String? = nil, modelVersion: Int = 0) {
        initialSettings = settings; initialK = k
        initialCore = core; initialCycles = cycles; self.sessionID = sessionID
        self.modelVersion = modelVersion
        do {
            try FileManager.default.createDirectory(at: spoolDirectory, withIntermediateDirectories: true)
            try JSONEncoder().encode(settings).write(to: spoolDirectory.appendingPathComponent("start-settings.json"), options: .atomic)
            var manifest: [String: Any] = ["recordingID": recordingID, "startedAt": ISO8601DateFormatter().string(from: startedAt), "startK": k, "algorithmVersion": AppIdentity.algorithmVersion, "sampleRate": 50, "version": 7, "startCycles": cycles,
                "build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
                "detectorConfiguration": try JSONSerialization.jsonObject(with: JSONEncoder().encode(settings.detectorConfig))]
            manifest["shadowConfiguration"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(ShadowConfiguration()))
            manifest["yarnCondition"] = settings.yarnCondition.rawValue
            manifest["sessionID"] = sessionID
            manifest["modelVersion"] = modelVersion
            manifest["timeOriginUptime"] = firstTimestamp
            if let core { manifest["startCore"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(core)) }
            try JSONSerialization.data(withJSONObject: manifest).write(to: spoolDirectory.appendingPathComponent("manifest.json"), options: .atomic)
        } catch { spoolError = error.localizedDescription }
    }
    private var lastTimestamp: TimeInterval = 0

    private var t: [Double] = []
    private var ax: [Double] = [], ay: [Double] = [], az: [Double] = []
    private var gx: [Double] = [], gy: [Double] = [], gz: [Double] = []
    private var grx: [Double] = [], gry: [Double] = [], grz: [Double] = []
    private var qw: [Double] = [], qx: [Double] = [], qy: [Double] = [], qz: [Double] = []
    private var detected: [Double] = []
    private var pauses: [Double] = []
    private var resumes: [Double] = []
    private var markers: [Double] = []
    private var counter: [CounterEvent] = []
    private let lock = NSLock()

    var error: String? { lock.withLock { spoolError } }
    var sampleCount: Int { lock.withLock { totalSamples } }
    var markerCount: Int { lock.withLock { totalMarkers } }
    var detectedCount: Int { lock.withLock { totalDetected } }

    func append(_ motion: CMDeviceMotion, events: [DetectorEvent], candidate: CandidateDecision?, shadow: [ShadowEvent] = []) {
        lock.lock(); defer { lock.unlock() }
        if firstTimestamp == nil { firstTimestamp = motion.timestamp }
        let rel = motion.timestamp - (firstTimestamp ?? motion.timestamp)
        lastTimestamp = motion.timestamp

        for event in shadow { appendShadowLocked(event) }
        totalSamples += 1
        if var candidate {
            candidate.eventTime -= firstTimestamp ?? 0
            candidate.decisionTime -= firstTimestamp ?? 0
            candidates.append(candidate)
        }
        t.append(r(rel, 3))
        ax.append(r(motion.userAcceleration.x)); ay.append(r(motion.userAcceleration.y)); az.append(r(motion.userAcceleration.z))
        gx.append(r(motion.rotationRate.x)); gy.append(r(motion.rotationRate.y)); gz.append(r(motion.rotationRate.z))
        grx.append(r(motion.gravity.x)); gry.append(r(motion.gravity.y)); grz.append(r(motion.gravity.z))
        let q = motion.attitude.quaternion
        qw.append(r(q.w, 6)); qx.append(r(q.x, 6)); qy.append(r(q.y, 6)); qz.append(r(q.z, 6))

        for event in events {
            switch event {
            case .cycle: totalDetected += 1; detected.append(r(rel, 3))
            case .paused: pauses.append(r(rel, 3))
            case .resumed: resumes.append(r(rel, 3))
            }
        }
        if t.count >= 250 { checkpoint() }
    }

    private func appendShadowLocked(_ event: ShadowEvent) {
        var event = event
        event.eventTime -= firstTimestamp ?? 0
        event.decisionTime -= firstTimestamp ?? 0
        shadowEvents.append(event)
    }
    func logShadow(_ event: ShadowEvent) {
        lock.lock(); defer { lock.unlock() }
        appendShadowLocked(event)
    }

    /// Five seconds of raw samples per atomic spool chunk. Survives process death;
    /// a crash can lose at most the current chunk. No raw sample is masked away.
    private func checkpoint() {
        guard !t.isEmpty else { return }
        do {
            var raw: [String: Any] = ["t": t, "ax": ax, "ay": ay, "az": az, "gx": gx, "gy": gy, "gz": gz, "grx": grx, "gry": gry, "grz": grz]
            raw["qw"] = qw; raw["qx"] = qx; raw["qy"] = qy; raw["qz"] = qz
            raw["shadowEvents"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(shadowEvents))
            raw["counterEvents"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(counter))
            raw["candidateEvents"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(candidates))
            raw["detectedStitchTimes"] = detected; raw["pauseTimes"] = pauses; raw["resumeTimes"] = resumes; raw["markerTimes"] = markers
            let url = spoolDirectory.appendingPathComponent(String(format: "raw-%06d.json", chunks.count))
            try JSONSerialization.data(withJSONObject: raw).write(to: url, options: .atomic)
            chunks.append(url)
            t.removeAll(keepingCapacity: true)
            ax.removeAll(keepingCapacity: true); ay.removeAll(keepingCapacity: true); az.removeAll(keepingCapacity: true)
            gx.removeAll(keepingCapacity: true); gy.removeAll(keepingCapacity: true); gz.removeAll(keepingCapacity: true)
            grx.removeAll(keepingCapacity: true); gry.removeAll(keepingCapacity: true); grz.removeAll(keepingCapacity: true)
            qw.removeAll(keepingCapacity: true); qx.removeAll(keepingCapacity: true); qy.removeAll(keepingCapacity: true); qz.removeAll(keepingCapacity: true)
            counter.removeAll(keepingCapacity: true); candidates.removeAll(keepingCapacity: true); shadowEvents.removeAll(keepingCapacity: true)
            detected.removeAll(keepingCapacity: true); pauses.removeAll(keepingCapacity: true)
            resumes.removeAll(keepingCapacity: true); markers.removeAll(keepingCapacity: true)
        } catch { spoolError = error.localizedDescription }
    }

    /// Markør satt av brukeren «nå».
    func addMarker() {
        lock.lock(); defer { lock.unlock() }
        totalMarkers += 1
        markers.append(nowRelative())
    }

    func logCounter(kind: String, round: Int, stitchInRow: Int, stitches: Int,
                    beforeStitches: Int? = nil, groupId: String? = nil, eventTime: Double? = nil, parameters: Settings? = nil) {
        lock.lock(); defer { lock.unlock() }
        sequence += 1
        counter.append(CounterEvent(t: nowRelative(), kind: kind, round: round, stitchInRow: stitchInRow,
                                   stitches: stitches, beforeStitches: beforeStitches, groupId: groupId,
                                   eventTime: eventTime.map { $0 - (firstTimestamp ?? 0) }, decisionTime: nowRelative(), sequence: sequence, parameters: parameters))
    }

    /// CMDeviceMotion.timestamp er systemets uptime.
    private func nowRelative() -> Double {
        let nowUptime = ProcessInfo.processInfo.systemUptime
        let rel = nowUptime - (firstTimestamp ?? nowUptime)
        return r(max(0, rel), 3)
    }

    func finish(settings: Settings, wrist: Wrist, systemWrist: Wrist, estimatedStitches: Int,
                trueStitches: Int?, note: String?,
                patternId: String? = nil, startRound: Int? = nil, startStitchInRow: Int? = nil,
                endRound: Int? = nil, endStitchInRow: Int? = nil,
                autoStitches: Int? = nil, manualDelta: Int? = nil,
                automatic: Bool = false) -> MotionRecording {
        lock.lock(); defer { lock.unlock() }
        checkpoint()
        let duration = max(0, (firstTimestamp.map { lastTimestamp - $0 }) ?? 0)
        let meta = MotionRecording.Meta(
            recordingID: recordingID,
            detectorConfiguration: initialSettings.detectorConfig,
            shadowConfiguration: ShadowConfiguration(),
            yarnCondition: initialSettings.yarnCondition,
            modelVersion: modelVersion,
            timeOriginUptime: firstTimestamp,
            startSettings: initialSettings,
            startK: initialK,
            startCore: initialCore,
            startCycles: initialCycles,
            sessionID: sessionID,
            truthProvenance: trueStitches == nil ? "unknown" : "user-entered-total",
            algorithmVersion: AppIdentity.algorithmVersion,
            systemWrist: systemWrist,
            chosenWrist: settings.physicalWrist,
            displayedStitches: estimatedStitches,
            autoStitches: autoStitches,
            manualDelta: manualDelta,
            endRound: endRound,
            endStitchInRow: endStitchInRow,
            startedAt: startedAt,
            endedAt: startedAt.addingTimeInterval(duration),
            sampleRate: MotionTracker.sampleRate,
            device: deviceDescription(),
            settings: settings,
            trueStitches: trueStitches,
            detectedStitches: estimatedStitches,
            cycles: totalDetected,
            cyclesPerStitch: settings.cyclesPerStitch(for: wrist),
            wrist: wrist,
            patternId: patternId,
            startRound: startRound,
            startStitchInRow: startStitchInRow,
            automatic: automatic,
            note: note
        )
        // Preserve final metadata even if export fails or the process is terminated.
        do {
            let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
            let finalEvents: [String: Any] = ["shadowEvents": try JSONSerialization.jsonObject(with: encoder.encode(shadowEvents)), "counterEvents": try JSONSerialization.jsonObject(with: encoder.encode(counter)),
                "candidateEvents": try JSONSerialization.jsonObject(with: encoder.encode(candidates)),
                "markerTimes": markers, "detectedStitchTimes": detected, "pauseTimes": pauses, "resumeTimes": resumes]
            try JSONSerialization.data(withJSONObject: finalEvents).write(to: spoolDirectory.appendingPathComponent("final-events.json"), options: .atomic)
            try encoder.encode(meta).write(to: spoolDirectory.appendingPathComponent("final-meta.json"), options: .atomic)
        } catch { spoolError = error.localizedDescription }
        return MotionRecording(rawChunkPaths: chunks, shadowEvents: shadowEvents, candidateEvents: candidates, meta: meta, t: t, ax: ax, ay: ay, az: az, gx: gx, gy: gy, gz: gz,
                               grx: grx, gry: gry, grz: grz, qw: qw, qx: qx, qy: qy, qz: qz,
                               detectedStitchTimes: detected, pauseTimes: pauses, resumeTimes: resumes,
                               markerTimes: markers, counterEvents: counter)
    }

    private func r(_ v: Double, _ decimals: Int = 4) -> Double {
        let p = pow(10.0, Double(decimals))
        return (v * p).rounded() / p
    }

    private func deviceDescription() -> String {
        var size = 0
        sysctlbyname("hw.machine", nil, &size, nil, 0)
        var machine = [CChar](repeating: 0, count: size)
        sysctlbyname("hw.machine", &machine, &size, nil, 0)
        return String(cString: machine)
    }
}

/// Lagrer og lister opptak i Documents/recordings.
struct RecordingStore {
    static var directoryOverride: URL?
    struct Info: Identifiable, Equatable {
        var id: String { url.lastPathComponent }
        var url: URL
        var startedAt: Date
        var duration: TimeInterval
        var trueStitches: Int?
        var detectedStitches: Int
        var markers: Int
        var bytes: Int
    }

    static var directory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let dir = directoryOverride ?? docs.appendingPathComponent("recordings", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func save(_ recording: MotionRecording) throws -> URL {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        let suffix = recording.meta.recordingID.map { "-" + $0.prefix(8) } ?? ""
        let name = "rec-\(formatter.string(from: recording.meta.startedAt))\(suffix).json"
        let url = directory.appendingPathComponent(name)
        guard !FileManager.default.fileExists(atPath: url.path) else { throw CocoaError(.fileWriteFileExists) }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(recording)
        var bytes = data.count
        var markerTotal = recording.markerTimes.count
        if recording.rawChunkPaths.isEmpty {
            try data.write(to: url, options: .withoutOverwriting)
        } else {
            let temporary = url.appendingPathExtension(UUID().uuidString + ".writing")
            defer { try? FileManager.default.removeItem(at: temporary) }
            FileManager.default.createFile(atPath: temporary.path, contents: nil)
            let handle = try FileHandle(forWritingTo: temporary)
            defer { try? handle.close() }
            var fields = try JSONSerialization.jsonObject(with: data) as! [String: Any]
            let columns = ["t", "ax", "ay", "az", "gx", "gy", "gz", "grx", "gry", "grz", "qw", "qx", "qy", "qz", "shadowEvents", "candidateEvents", "counterEvents", "detectedStitchTimes", "pauseTimes", "resumeTimes", "markerTimes"]
            let tails = columns.map { fields.removeValue(forKey: $0) as? [Any] ?? [] }
            var header = try JSONSerialization.data(withJSONObject: fields, options: [.sortedKeys])
            header.removeLast()
            try handle.write(contentsOf: header)
            // Decode each checkpoint once. Autorelease Objective-C JSON objects
            // per chunk, rather than retaining an entire long export's temporaries.
            let workspace = temporary.appendingPathExtension("columns")
            try FileManager.default.createDirectory(at: workspace, withIntermediateDirectories: true)
            defer { try? FileManager.default.removeItem(at: workspace) }
            var streams: [FileHandle] = []
            defer { for stream in streams { try? stream.close() } }
            for key in columns {
                let file = workspace.appendingPathComponent(key)
                FileManager.default.createFile(atPath: file.path, contents: nil)
                streams.append(try FileHandle(forUpdating: file))
            }
            var hasValues = Array(repeating: false, count: columns.count)
            var lastSample: Double?
            func appendValues(_ values: [Any], at index: Int) throws {
                guard !values.isEmpty else { return }
                var encoded = try JSONSerialization.data(withJSONObject: values)
                encoded.removeFirst(); encoded.removeLast()
                if hasValues[index] { try streams[index].write(contentsOf: Data(",".utf8)) }
                try streams[index].write(contentsOf: encoded)
                hasValues[index] = true
            }
            for chunk in recording.rawChunkPaths {
                try autoreleasepool {
                    guard let raw = try JSONSerialization.jsonObject(with: Data(contentsOf: chunk)) as? [String: Any] else {
                        throw CocoaError(.fileReadCorruptFile)
                    }
                    guard let times = raw["t"] as? [Double], !times.isEmpty,
                          times.allSatisfy({ $0.isFinite }),
                          zip(times, times.dropFirst()).allSatisfy({ $0 < $1 }),
                          lastSample.map({ times[0] > $0 }) ?? true else { throw CocoaError(.fileReadCorruptFile) }
                    for key in ["ax", "ay", "az", "gx", "gy", "gz", "grx", "gry", "grz"] {
                        guard let values = raw[key] as? [Double], values.count == times.count,
                              values.allSatisfy({ $0.isFinite }) else { throw CocoaError(.fileReadCorruptFile) }
                    }
                    for key in ["qw", "qx", "qy", "qz"] {
                        let values = raw[key] as? [Double] ?? []
                        guard values.isEmpty || (values.count == times.count && values.allSatisfy({ $0.isFinite })) else { throw CocoaError(.fileReadCorruptFile) }
                    }
                    lastSample = times.last
                    markerTotal += (raw["markerTimes"] as? [Any] ?? []).count
                    for (index, key) in columns.enumerated() {
                        try appendValues(raw[key] as? [Any] ?? [], at: index)
                    }
                }
            }
            for (index, key) in columns.enumerated() {
                try appendValues(tails[index], at: index)
                try streams[index].seek(toOffset: 0)
                try handle.write(contentsOf: Data(",\"\(key)\":[".utf8))
                while let block = try streams[index].read(upToCount: 65536), !block.isEmpty {
                    try handle.write(contentsOf: block)
                }
                try handle.write(contentsOf: Data("]".utf8))
            }
            try handle.write(contentsOf: Data("}".utf8))
            try handle.synchronize()
            bytes = Int(try handle.offset())
            try handle.close()
            // Unique recording names; preserve a previous file in the unlikely collision case.
            guard !FileManager.default.fileExists(atPath: url.path) else { throw CocoaError(.fileWriteFileExists) }
            try FileManager.default.moveItem(at: temporary, to: url)
        }
        // Skriv et lite sammendrag ved siden av, så listen kan lastes uten å
        // parse hele opptaket.
        let summary = Summary(startedAt: recording.meta.startedAt,
                              duration: recording.meta.endedAt.timeIntervalSince(recording.meta.startedAt),
                              trueStitches: recording.meta.trueStitches,
                              detectedStitches: recording.meta.detectedStitches,
                              markers: markerTotal,
                              bytes: bytes)
        let sdata = try encoder.encode(summary)
        try sdata.write(to: url.appendingPathExtension("summary"), options: .atomic)
        if let directory = recording.rawChunkPaths.first?.deletingLastPathComponent() {
            try Data(url.lastPathComponent.utf8).write(to: directory.appendingPathComponent("exported.txt"), options: .atomic)
        }
        return url
    }

    static func list() -> [Info] {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        return files
            .filter { $0.pathExtension == "json" }
            .compactMap { url -> Info? in
                guard let data = try? Data(contentsOf: url.appendingPathExtension("summary")),
                      let s = try? decoder.decode(Summary.self, from: data) else { return nil }
                return Info(url: url, startedAt: s.startedAt, duration: s.duration, trueStitches: s.trueStitches,
                            detectedStitches: s.detectedStitches, markers: s.markers, bytes: s.bytes)
            }
            .sorted { $0.startedAt > $1.startedAt }
    }

    /// Retry finalized checkpoints left by a terminated export. Never consume
    /// an active recording or delete its raw evidence. Run once at app startup.
    static func recoverFinishedExports() -> [String] {
        let folders = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        var failures: [String] = []
        for folder in folders where folder.lastPathComponent.hasPrefix("partial-") {
            guard !FileManager.default.fileExists(atPath: folder.appendingPathComponent("exported.txt").path),
                  FileManager.default.fileExists(atPath: folder.appendingPathComponent("final-meta.json").path) else { continue }
            do {
                let meta = try JSONSerialization.jsonObject(with: Data(contentsOf: folder.appendingPathComponent("final-meta.json")))
                var object: [String: Any] = ["meta": meta]
                for key in ["t", "ax", "ay", "az", "gx", "gy", "gz", "grx", "gry", "grz", "qw", "qx", "qy", "qz", "shadowEvents", "counterEvents", "candidateEvents", "detectedStitchTimes", "pauseTimes", "resumeTimes", "markerTimes"] { object[key] = [Any]() }
                let finalEvents = folder.appendingPathComponent("final-events.json")
                if FileManager.default.fileExists(atPath: finalEvents.path),
                   let events = try JSONSerialization.jsonObject(with: Data(contentsOf: finalEvents)) as? [String: Any] {
                    for key in ["shadowEvents", "counterEvents", "candidateEvents", "detectedStitchTimes", "pauseTimes", "resumeTimes", "markerTimes"] {
                        if let values = events[key] { object[key] = values }
                    }
                }
                let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601
                var recording = try decoder.decode(MotionRecording.self, from: JSONSerialization.data(withJSONObject: object))
                recording.rawChunkPaths = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
                    .filter { $0.lastPathComponent.hasPrefix("raw-") && $0.pathExtension == "json" }
                    .sorted { $0.lastPathComponent < $1.lastPathComponent }
                guard !recording.rawChunkPaths.isEmpty else { continue }
                guard recording.rawChunkPaths.enumerated().allSatisfy({ index, file in
                    file.lastPathComponent == String(format: "raw-%06d.json", index)
                }) else { throw CocoaError(.fileReadCorruptFile) }
                _ = try save(recording)
            } catch let error as CocoaError where error.code == .fileWriteFileExists {
                // The completed immutable export already exists; never overwrite it.
                continue
            } catch { failures.append(folder.lastPathComponent + ": " + error.localizedDescription) }
        }
        return failures
    }

    static func delete(_ info: Info) {
        try? FileManager.default.removeItem(at: info.url)
        try? FileManager.default.removeItem(at: info.url.appendingPathExtension("summary"))
    }

    private struct Summary: Codable {
        var startedAt: Date
        var duration: TimeInterval
        var trueStitches: Int?
        var detectedStitches: Int
        var markers: Int
        var bytes: Int
    }
}
