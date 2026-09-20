import Foundation
import SwiftUI

/// En oppskrift kompilert fra MASKLAB (`scripts`/`src/patterns`), runde for
/// runde med fargeløp. Ligger som JSON i `Patterns/` i app-bundelen.
struct Pattern: Codable, Equatable {
    struct Run: Codable, Equatable {
        var color: String
        var count: Int
    }

    struct Round: Codable, Equatable {
        var num: Int
        var phase: String
        var count: Int
        var chartRow: Int?
        var increaseEvery: Int?
        var runs: [Run]

        /// Farge på maske nr. `index` (0-basert). Nil utenfor runden.
        func color(at index: Int) -> String? {
            guard index >= 0 else { return nil }
            var start = 0
            for run in runs {
                if index < start + run.count { return run.color }
                start += run.count
            }
            return nil
        }

        struct RunInfo {
            var run: Run
            /// 1-basert første og siste maske i løpet.
            var start: Int
            var end: Int
            /// 1-basert posisjon i løpet.
            var position: Int
        }

        /// Løpet maske nr. `index` (0-basert) hører til.
        func runInfo(at index: Int) -> RunInfo? {
            guard index >= 0 else { return nil }
            var start = 0
            for run in runs {
                if index < start + run.count {
                    return RunInfo(run: run, start: start + 1, end: start + run.count, position: index - start + 1)
                }
                start += run.count
            }
            return nil
        }

        var title: String {
            if let row = chartRow { return "Runde \(num) · diagramrad \(row)" }
            return "Runde \(num)"
        }
    }

    var id: String
    var title: String
    var rounds: [Round]

    func round(num: Int) -> Round? { rounds.first { $0.num == num } }

    static let available: [(id: String, title: String)] = [("ro-ro-ro", "RO RO RO")]

    static func load(id: String) -> Pattern? {
        guard let url = Bundle.main.url(forResource: id, withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(Pattern.self, from: data)
    }
}

/// Norske navn og farger for garnfargene i oppskriftene.
enum Yarn {
    static func name(_ id: String) -> String {
        switch id {
        case "white": return "hvit"
        case "red": return "rød"
        case "blue": return "blå"
        case "black": return "svart"
        case "cream": return "krem"
        case "sand": return "sand"
        default: return id
        }
    }

    static func plural(_ id: String) -> String {
        switch id {
        case "white": return "hvite"
        case "red": return "røde"
        case "blue": return "blå"
        case "black": return "svarte"
        default: return name(id)
        }
    }

    static func color(_ id: String) -> Color {
        switch id {
        case "white": return Color(red: 0.96, green: 0.94, blue: 0.88)
        case "red": return Color(red: 0.72, green: 0.11, blue: 0.14)
        case "blue": return Color(red: 0.10, green: 0.20, blue: 0.50)
        case "black": return Color(white: 0.1)
        case "cream": return Color(red: 0.94, green: 0.89, blue: 0.77)
        case "sand": return Color(red: 0.85, green: 0.78, blue: 0.64)
        default: return .gray
        }
    }
}
