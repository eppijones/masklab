import Foundation

/// Brukerinnstillinger, lagret i UserDefaults.
struct Settings: Codable, Equatable {
    /// Høyre. 3,40 traff 14:04 eksakt (102/30). 15:19 med need 3 ligger på −2.
    /// k=1,5 i 3.2 krediterte ved omslag og ga 70 auto mot 28 faktiske.
    var cyclesPerStitchRight: Double = 3.40
    /// Sykler per maske, venstre. Bare brukt hvis fysisk håndledd er venstre.
    var cyclesPerStitchLeft: Double = 3.40
    /// Overstyrer systemets wristLocation. Nil = bruk klokka.
    var physicalWrist: Wrist? = .right
    var hapticPerStitch = false
    var hapticEveryTen = true
    var stitchesPerRow = 0
    var autoNewRow = false
    var keepAwake = true
    var patternId: String? = "ro-ro-ro"
    var hapticColorChange = true
    var autoRecord = true
    var yarnCondition: YarnCondition = .unknown
    /// Legacy decoding field. CountingCore never uses a timed stitch lockout.
    var minStitchInterval: TimeInterval = 5
    var version = Settings.currentVersion

    static let currentVersion = 11
    static let key = "masketeller.settings"

    static func load() -> Settings {
        guard let data = UserDefaults.standard.data(forKey: key),
              var decoded = try? JSONDecoder().decode(Settings.self, from: data) else {
            var fresh = Settings()
            fresh.version = 0
            return fresh
        }
        if decoded.version < 2 {
            decoded.hapticPerStitch = false
        }
        return decoded
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        cyclesPerStitchRight = try c.decodeIfPresent(Double.self, forKey: .cyclesPerStitchRight) ?? 3.40
        cyclesPerStitchLeft = try c.decodeIfPresent(Double.self, forKey: .cyclesPerStitchLeft) ?? 3.40
        physicalWrist = try c.decodeIfPresent(Wrist.self, forKey: .physicalWrist) ?? .right
        hapticPerStitch = try c.decodeIfPresent(Bool.self, forKey: .hapticPerStitch) ?? false
        hapticEveryTen = try c.decodeIfPresent(Bool.self, forKey: .hapticEveryTen) ?? true
        stitchesPerRow = try c.decodeIfPresent(Int.self, forKey: .stitchesPerRow) ?? 0
        autoNewRow = try c.decodeIfPresent(Bool.self, forKey: .autoNewRow) ?? false
        keepAwake = try c.decodeIfPresent(Bool.self, forKey: .keepAwake) ?? true
        patternId = try c.decodeIfPresent(String.self, forKey: .patternId) ?? "ro-ro-ro"
        hapticColorChange = try c.decodeIfPresent(Bool.self, forKey: .hapticColorChange) ?? true
        autoRecord = try c.decodeIfPresent(Bool.self, forKey: .autoRecord) ?? true
        yarnCondition = try c.decodeIfPresent(YarnCondition.self, forKey: .yarnCondition) ?? .unknown
        minStitchInterval = try c.decodeIfPresent(TimeInterval.self, forKey: .minStitchInterval) ?? 5
        version = try c.decodeIfPresent(Int.self, forKey: .version) ?? 1
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Settings.key)
        }
    }

    var detectorConfig: CycleCounterConfig { CycleCounterConfig() }

    func cyclesPerStitch(for wrist: Wrist) -> Double {
        switch wrist {
        case .left: return cyclesPerStitchLeft
        case .right: return cyclesPerStitchRight
        }
    }

    mutating func setCyclesPerStitch(_ value: Double, for wrist: Wrist) {
        let clamped = max(0.5, min(30, value))
        switch wrist {
        case .left: cyclesPerStitchLeft = clamped
        case .right: cyclesPerStitchRight = clamped
        }
    }
}

enum Wrist: String, Codable, CaseIterable {
    case left, right

    var label: String { self == .left ? "venstre" : "høyre" }
}

 enum YarnCondition: String, Codable, CaseIterable {
    case unknown, oneYarn = "one-yarn", twoYarn = "two-yarn"
    var label: String {
        switch self { case .unknown: return "Ikke angitt"; case .oneYarn: return "Ett garn"; case .twoYarn: return "To garn" }
    }
}
