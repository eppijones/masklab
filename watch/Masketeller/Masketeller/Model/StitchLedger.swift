import Foundation

/// Tellelogikk uten WatchKit – brukes av appen og av offline-tester.
/// `autoCredited` er «hvor mange masker automatikken mener den har levert
/// gitt cycles/k». Etter manuell rettelse settes den lik target, så gamle
/// sykler ikke legger masker tilbake.
struct StitchLedger: Equatable {
    var cycles = 0
    var autoCredited = 0
    var stitches = 0
    var stitchesInRow = 0
    var rows = 1
    var k: Double
    /// 0 = ingen rundemål.
    var rowTarget = 0

    /// `floor(cycles / k)` – `rounded` krediterte ved 0,5·k, altså midt i
    /// omslaget, før tråden er trukket gjennom de to løkkene.
    var target: Int {
        guard k > 0 else { return autoCredited }
        return Int(Double(cycles) / k)
    }

    /// Legg til bekreftede sykler. Returnerer antall nye automatiske masker.
    @discardableResult
    mutating func addCycles(_ n: Int) -> Int {
        guard n > 0 else { return 0 }
        cycles += n
        var added = 0
        let goal = target
        while autoCredited < goal {
            autoCredited += 1
            creditOne()
            added += 1
        }
        return added
    }

    mutating func applyManual(stitches newTotal: Int, stitchesInRow newInRow: Int, rows newRows: Int) {
        stitches = max(0, newTotal)
        stitchesInRow = max(0, newInRow)
        rows = max(1, newRows)
        autoCredited = target
    }

    private mutating func creditOne() {
        stitches += 1
        stitchesInRow += 1
        if rowTarget > 0, stitchesInRow >= rowTarget {
            rows += 1
            stitchesInRow = 0
        }
    }
}
