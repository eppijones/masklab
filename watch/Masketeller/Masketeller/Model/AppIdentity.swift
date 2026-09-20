import Foundation

/// Synlig i UI og i opptaks-meta. Endres når gjenkjenning eller tellelogikk endres.
enum AppIdentity {
    static let algorithmVersion = "cycle-5.1"
    /// Runde 29, 40 ferdige. Eksisterende aktiv fremdrift bevares.
    static let recoveryId = "20260906-r29-s40-safe-v2"
}

/// Lagrer hvilke recovery-handlinger som allerede er kjørt. Ikke Settings.version.
enum PositionRecovery {
    private static let key = "masketeller.recovery.applied"

    static func hasApplied(_ id: String) -> Bool {
        applied().contains(id)
    }

    static func markApplied(_ id: String) {
        var ids = applied()
        guard !ids.contains(id) else { return }
        ids.append(id)
        UserDefaults.standard.set(ids, forKey: key)
    }

    static func applied() -> [String] {
        UserDefaults.standard.stringArray(forKey: key) ?? []
    }
}
