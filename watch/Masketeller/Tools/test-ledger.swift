import Foundation

// Tester produksjonslogikken i StitchLedger (samme fil som appen).
//   swiftc -parse-as-library Tools/test-ledger.swift \
//     Masketeller/Model/StitchLedger.swift Masketeller/Model/Pattern.swift \
//     && ./test-ledger  — kjøres av Tools/test-ledger.sh

@main
struct LedgerTests {
    static func main() {
        var fails = 0
        func check(_ name: String, _ ok: Bool) {
            if ok { print("ok  \(name)") }
            else { print("FAIL \(name)"); fails += 1 }
        }

        // 50 → 40 forblir 40 uten ny syklus.
        var L = StitchLedger(cycles: 200, autoCredited: 50, stitches: 50, stitchesInRow: 50, rows: 29, k: 4.0, rowTarget: 100)
        L.applyManual(stitches: 40, stitchesInRow: 40, rows: 29)
        check("50→40 baseline", L.stitches == 40 && L.autoCredited == 50 && L.target == 50)
        let added = L.addCycles(1)
        check("én syklus etter 50→40 gir 0 masker", added == 0 && L.stitches == 40)

        // Ny fullført deteksjon (nok sykler til neste target) gir +1, ikke +10.
        L.addCycles(3) // 204 / 4 = 51 (floor)
        check("neste target er +1", L.stitches == 41 && L.autoCredited == 51)

        // floor: ikke krediter ved 0,5·k (det var omslaget, før gjennomtrekk).
        var F = StitchLedger(k: 3.75)
        F.addCycles(3)
        check("3 sykler / 3,75 = 0 masker", F.stitches == 0 && F.autoCredited == 0)
        F.addCycles(1)
        check("4 sykler / 3,75 = 1 maske", F.stitches == 1 && F.autoCredited == 1)

        // Kronegruppe: flere applyManual endrer ikke k (k bor utenfor ledger).
        let kBefore = L.k
        L.applyManual(stitches: 30, stitchesInRow: 30, rows: 29)
        L.applyManual(stitches: 40, stitchesInRow: 40, rows: 29)
        check("k uendret av manuell", L.k == kBefore)
        check("siste manuell vinner", L.stitches == 40 && L.stitchesInRow == 40)

        // Oppskrift: runde 29, 40 ferdige → neste 41 hvit 1/4; 44 → 45 rød 1/5.
        let url = URL(fileURLWithPath: "Masketeller/Patterns/ro-ro-ro.json")
        if let data = try? Data(contentsOf: url),
           let pattern = try? JSONDecoder().decode(Pattern.self, from: data),
           let r = pattern.round(num: 29) {
            let a = r.runInfo(at: 40)
            let b = r.runInfo(at: 44)
            check("neste 41 hvit 1/4", a?.run.color == "white" && a?.start == 41 && a?.end == 44 && a?.position == 1)
            check("neste 45 rød 1/5", b?.run.color == "red" && b?.start == 45 && b?.end == 49 && b?.position == 1)
            let c = r.runInfo(at: 71)
            check("neste 72 rød 1/2", c?.run.color == "red" && c?.start == 72 && c?.end == 73 && c?.position == 1)
            check("ikke hatterunde 10", r.chartRow == 10 && r.num == 29)
        } else {
            check("lastet ro-ro-ro runde 29", false)
        }

        if fails > 0 { print("\(fails) feil"); exit(1) }
        print("alle tester ok")
    }
}
