import Foundation

/// Én fullført telleøkt.
struct SessionRecord: Codable, Identifiable, Equatable {
    var id = UUID()
    var started: Date
    var ended: Date
    var stitches: Int
    var rows: Int
    /// Sekunder per maske ved slutten av økten (nil hvis aldri estimert).
    var period: TimeInterval?

    var duration: TimeInterval { ended.timeIntervalSince(started) }
}

/// Pågående økt – lagres fortløpende så ingenting går tapt om appen avsluttes.
struct ActiveSessionState: Codable, Equatable {
    var started: Date
    var stitches: Int
    var rows: Int
    var stitchesInRow: Int
    /// Bekreftede sykler i økten og ved radstart (valgfrie for eldre filer).
    var cycles: Int? = nil
    var cyclesAtRowStart: Int? = nil
    var autoCredited: Int? = nil
}

/// Enkel JSON-lagring i appens Documents-mappe.
final class SessionStore {
    private let historyURL: URL
    private let activeURL: URL
    private(set) var history: [SessionRecord] = []

    init(directory: URL? = nil) {
        let dir = directory ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        historyURL = dir.appendingPathComponent("sessions.json")
        activeURL = dir.appendingPathComponent("active-session.json")
        history = (try? Data(contentsOf: historyURL)).flatMap { try? JSONDecoder().decode([SessionRecord].self, from: $0) } ?? []
    }

    func append(_ record: SessionRecord) {
        history.insert(record, at: 0)
        if history.count > 200 { history = Array(history.prefix(200)) }
        persistHistory()
    }

    func delete(_ record: SessionRecord) {
        history.removeAll { $0.id == record.id }
        persistHistory()
    }

    func clearHistory() {
        history.removeAll()
        persistHistory()
    }

    func loadActive() -> ActiveSessionState? {
        (try? Data(contentsOf: activeURL)).flatMap { try? JSONDecoder().decode(ActiveSessionState.self, from: $0) }
    }

    func saveActive(_ state: ActiveSessionState?) {
        if let state, let data = try? JSONEncoder().encode(state) {
            try? data.write(to: activeURL, options: .atomic)
        } else {
            try? FileManager.default.removeItem(at: activeURL)
        }
    }

    private func persistHistory() {
        if let data = try? JSONEncoder().encode(history) {
            try? data.write(to: historyURL, options: .atomic)
        }
    }
}
