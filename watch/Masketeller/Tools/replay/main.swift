import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// Spiller av et opptak fra klokka gjennom CycleCounter og sammenligner med
// fasit. Bygges av ../replay.sh sammen med Motion/-kildene fra appen.
//
//   replay.sh rec.json                 sammendrag + sykler/anslag
//   replay.sh rec.json --k 4.84        bruk gitt sykler-per-maske
//   replay.sh rec.json --split 1435.6 58 17   sjekk forholdet før/etter et tidspunkt
//                                      (58 masker før, 17 etter)
//   replay.sh rec.json --plot out.png  tegner signalet med masker og markører
//   replay.sh rec.json --csv out.csv   dumper signalet til CSV

struct Recording: Decodable {
    struct Meta: Decodable {
        var startedAt: String
        var sampleRate: Double
        var device: String
        var trueStitches: Int?
        var detectedStitches: Int
        var cycles: Int?
        var cyclesPerStitch: Double?
        var wrist: String?
        var settings: SettingsLite
    }
    struct SettingsLite: Decodable {
        var cyclesPerStitchRight: Double?
        var cyclesPerStitchLeft: Double?
    }
    var meta: Meta
    var t: [Double]
    var ax: [Double], ay: [Double], az: [Double]
    var gx: [Double], gy: [Double], gz: [Double]
    var grx: [Double], gry: [Double], grz: [Double]
    var detectedStitchTimes: [Double]
    var markerTimes: [Double]
}

func load(_ path: String) throws -> Recording {
    let data = try Data(contentsOf: URL(fileURLWithPath: path))
    return try JSONDecoder().decode(Recording.self, from: data)
}

func mag(_ x: Double, _ y: Double, _ z: Double) -> Double { (x * x + y * y + z * z).squareRoot() }
func gyroMag(_ r: Recording) -> [Double] { (0..<r.t.count).map { mag(r.gx[$0], r.gy[$0], r.gz[$0]) } }
func accMag(_ r: Recording) -> [Double] { (0..<r.t.count).map { mag(r.ax[$0], r.ay[$0], r.az[$0]) } }

func samples(_ r: Recording) -> [MotionSample] {
    (0..<r.t.count).map { i in
        MotionSample(timestamp: r.t[i],
                     userAcceleration: SIMD3(r.ax[i], r.ay[i], r.az[i]),
                     rotationRate: SIMD3(r.gx[i], r.gy[i], r.gz[i]))
    }
}

struct RunResult {
    var stitchTimes: [Double]   // tidspunkt for bekreftede sykler
    var pauses: Int
}

func run(_ s: [MotionSample], config: CycleCounterConfig) -> RunResult {
    let det = CycleCounter(config: config)
    var times: [Double] = []
    var pauses = 0
    for sample in s {
        for ev in det.process(sample) {
            switch ev {
            case .cycle: times.append(sample.timestamp)
            case .paused: pauses += 1
            case .resumed: break
            }
        }
    }
    return RunResult(stitchTimes: times, pauses: pauses)
}

func percentile(_ sorted: [Double], _ p: Double) -> Double {
    guard !sorted.isEmpty else { return 0 }
    let idx = min(sorted.count - 1, Int(Double(sorted.count - 1) * p))
    return sorted[idx]
}

func fmt(_ v: Double, _ d: Int = 2) -> String { String(format: "%.\(d)f", v) }

// MARK: - Plot

func plot(_ r: Recording, replayed: [Double], to path: String, range: ClosedRange<Double>? = nil, axes: Bool = false) {
    let W = 2400, H = 900
    let cs = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                              space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
    ctx.setFillColor(CGColor(gray: 1, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
    guard r.t.count > 1 else { return }
    // Klipp til ønsket tidsvindu
    let lo = range?.lowerBound ?? r.t[0]
    let hi = range?.upperBound ?? r.t[r.t.count - 1]
    let idx = (0..<r.t.count).filter { r.t[$0] >= lo && r.t[$0] <= hi }
    guard idx.count > 1 else { print("Tomt tidsvindu"); return }
    let tt = idx.map { r.t[$0] }
    let n = tt.count
    let tMin = tt[0], tMax = tt[n - 1]
    let markers = r.markerTimes.filter { $0 >= lo && $0 <= hi }
    let live = r.detectedStitchTimes.filter { $0 >= lo && $0 <= hi }
    let rep = replayed.filter { $0 >= lo && $0 <= hi }
    let left = 60.0, right = Double(W) - 20, top = 20.0
    func x(_ t: Double) -> CGFloat { CGFloat(left + (right - left) * (t - tMin) / max(1e-9, tMax - tMin)) }
    let gridStep = (tMax - tMin) > 300 ? 60.0 : ((tMax - tMin) > 60 ? 10.0 : 1.0)

    // Standard: |gyro| og 6·|acc|. Med `axes`: seks baner med fortegn (gx gy gz ax ay az).
    let gmagAll = gyroMag(r), amagAll = accMag(r)
    var lanes: [([Double], CGColor, String)] = []
    if axes {
        let cols: [(String, [Double], CGColor)] = [
            ("gx rad/s", r.gx, CGColor(red: 0.1, green: 0.3, blue: 0.9, alpha: 1)),
            ("gy rad/s", r.gy, CGColor(red: 0.1, green: 0.5, blue: 0.7, alpha: 1)),
            ("gz rad/s", r.gz, CGColor(red: 0.3, green: 0.2, blue: 0.8, alpha: 1)),
            ("ax g", r.ax, CGColor(red: 0.9, green: 0.4, blue: 0.1, alpha: 1)),
            ("ay g", r.ay, CGColor(red: 0.8, green: 0.5, blue: 0.0, alpha: 1)),
            ("az g", r.az, CGColor(red: 0.7, green: 0.3, blue: 0.2, alpha: 1)),
            ("gravity x", r.grx, CGColor(red: 0.2, green: 0.6, blue: 0.2, alpha: 1)),
            ("gravity y", r.gry, CGColor(red: 0.1, green: 0.5, blue: 0.3, alpha: 1)),
            ("gravity z", r.grz, CGColor(red: 0.3, green: 0.4, blue: 0.1, alpha: 1)),
        ]
        for c in cols { lanes.append((idx.map { c.1[$0] }, c.2, c.0)) }
    } else {
        lanes = [
            (idx.map { gmagAll[$0] }, CGColor(red: 0.1, green: 0.3, blue: 0.9, alpha: 1), "|gyro| rad/s"),
            (idx.map { amagAll[$0] * 6 }, CGColor(red: 0.9, green: 0.4, blue: 0.1, alpha: 1), "6·|acc| g"),
        ]
    }
    let laneH = (Double(H) - 60) / Double(lanes.count)
    for (li, lane) in lanes.enumerated() {
        let y0 = top + laneH * Double(li)
        let absSorted = lane.0.map { abs($0) }.sorted()
        let vmax = max(0.5, percentile(absSorted, 0.995))
        let signed = axes
        func y(_ v: Double) -> CGFloat {
            let frac = signed ? (0.5 + 0.5 * max(-1, min(1, v / vmax))) : min(1, v / vmax)
            return CGFloat(Double(H) - (y0 + laneH - 10 - (laneH - 30) * frac))
        }
        let yLo = y(signed ? -vmax : 0), yHi = y(vmax), yMid = y(signed ? 0 : vmax * 0.5)
        // Grid
        ctx.setStrokeColor(CGColor(gray: 0.9, alpha: 1)); ctx.setLineWidth(1)
        var s = (tMin / gridStep).rounded(.up) * gridStep
        while s <= tMax { ctx.move(to: CGPoint(x: x(s), y: yLo)); ctx.addLine(to: CGPoint(x: x(s), y: yHi)); s += gridStep }
        ctx.strokePath()
        // Markers (user) – yellow
        ctx.setStrokeColor(CGColor(red: 0.95, green: 0.75, blue: 0.0, alpha: 0.9)); ctx.setLineWidth(3)
        for m in markers { ctx.move(to: CGPoint(x: x(m), y: yLo)); ctx.addLine(to: CGPoint(x: x(m), y: yHi)) }
        ctx.strokePath()
        // Real-time detected – red (top half), replayed – green (bottom half)
        ctx.setStrokeColor(CGColor(red: 0.9, green: 0.1, blue: 0.1, alpha: 0.8)); ctx.setLineWidth(1.5)
        for d in live { ctx.move(to: CGPoint(x: x(d), y: yMid)); ctx.addLine(to: CGPoint(x: x(d), y: yHi)) }
        ctx.strokePath()
        ctx.setStrokeColor(CGColor(red: 0.0, green: 0.6, blue: 0.2, alpha: 0.9)); ctx.setLineWidth(1.5)
        for d in rep { ctx.move(to: CGPoint(x: x(d), y: yLo)); ctx.addLine(to: CGPoint(x: x(d), y: yMid)) }
        ctx.strokePath()
        // Signal
        ctx.setStrokeColor(lane.1); ctx.setLineWidth(1)
        ctx.move(to: CGPoint(x: x(tt[0]), y: y(lane.0[0])))
        for i in 1..<n { ctx.addLine(to: CGPoint(x: x(tt[i]), y: y(lane.0[i]))) }
        ctx.strokePath()
        // Axis labels
        ctx.setStrokeColor(CGColor(gray: 0.3, alpha: 1))
        ctx.move(to: CGPoint(x: x(tMin), y: y(0))); ctx.addLine(to: CGPoint(x: x(tMax), y: y(0))); ctx.strokePath()
        drawText(ctx, "\(lane.2)  (±\(fmt(vmax, 1)))", at: CGPoint(x: left, y: yHi + 4))
    }
    drawText(ctx, "\(fmt(tMin, 0))–\(fmt(tMax, 0)) s · Gul = markør · Rød (øverst) = telt på klokka · Grønn (nederst) = replay · rutenett \(fmt(gridStep, 0)) s", at: CGPoint(x: left, y: 4))
    guard let img = ctx.makeImage(),
          let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil) else { return }
    CGImageDestinationAddImage(dest, img, nil)
    CGImageDestinationFinalize(dest)
    print("Plot skrevet til \(path)")
}

func drawText(_ ctx: CGContext, _ text: String, at point: CGPoint) {
    let font = CTFontCreateWithName("Helvetica" as CFString, 20, nil)
    let attrs: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(gray: 0.2, alpha: 1),
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attrs))
    ctx.saveGState()
    ctx.textPosition = point
    CTLineDraw(line, ctx)
    ctx.restoreGState()
}

// MARK: - Main

let args = CommandLine.arguments
guard args.count >= 2 else {
    print("bruk: replay <rec.json> [--plot out.png] [--csv out.csv]")
    exit(2)
}
let rec = try load(args[1])
let s = samples(rec)
let rate = rec.meta.sampleRate
let duration = rec.t.last ?? 0

print("Opptak:        \(args[1])")
print("Enhet:         \(rec.meta.device)   start \(rec.meta.startedAt)")
print("Varighet:      \(fmt(duration, 1)) s, \(rec.t.count) prøver @ \(rate) Hz")
print("Fasit:         \(rec.meta.trueStitches.map(String.init) ?? "ukjent") masker")
print("Anslag live:   \(rec.meta.detectedStitches)  (sykler \(rec.meta.cycles.map(String.init) ?? "–"), k \(rec.meta.cyclesPerStitch.map { fmt($0) } ?? "–"), håndledd \(rec.meta.wrist ?? "–"))")
print("Markører:      \(rec.markerTimes.count)  \(rec.markerTimes.map { fmt($0, 1) }.joined(separator: " "))")

let gmagSorted = gyroMag(rec).sorted()
let amagSorted = accMag(rec).sorted()
func statsLine(_ label: String, _ v: [Double]) -> String {
    "\(label) p50 \(fmt(percentile(v, 0.5))) p90 \(fmt(percentile(v, 0.9))) p99 \(fmt(percentile(v, 0.99))) max \(fmt(v.last ?? 0))"
}
print(statsLine("|gyro| rad/s: ", gmagSorted))
print(statsLine("|acc| g:      ", amagSorted))

if let truth = rec.meta.trueStitches, truth > 0, duration > 0 {
    print("Sann periode:  ≈ \(fmt(duration / Double(truth))) s/maske (hvis hele opptaket var hekling)")
}
if rec.markerTimes.count >= 2 {
    let gaps = zip(rec.markerTimes.dropFirst(), rec.markerTimes).map { $0 - $1 }
    print("Markør-avstand: median \(fmt(gaps.sorted()[gaps.count / 2])) s")
}

// Flagg som påvirker replay
var kOverride: Double? = nil
var split: (t: Double, before: Int, after: Int)? = nil
var thresholdOverride: Double? = nil
for (j, a) in CommandLine.arguments.enumerated() {
    if a == "--k", j + 1 < args.count { kOverride = Double(args[j + 1]) }
    if a == "--threshold", j + 1 < args.count { thresholdOverride = Double(args[j + 1]) }
    if a == "--split", j + 3 < args.count {
        split = (Double(args[j + 1]) ?? 0, Int(args[j + 2]) ?? 0, Int(args[j + 3]) ?? 0)
    }
}
var cfg = CycleCounterConfig()
cfg.sampleRate = rate
if let th = thresholdOverride { cfg.threshold = th }
let threshold = cfg.threshold
let base = run(s, config: cfg)
let k = kOverride ?? rec.meta.cyclesPerStitch ?? Settings().cyclesPerStitchRight
let estimate = Double(base.stitchTimes.count) / k
var line = "\nReplay: \(base.stitchTimes.count) sykler, \(base.pauses) pauser, terskel \(fmt(threshold, 1)) → anslag \(fmt(estimate, 1)) masker (k \(fmt(k)))"
if let truth = rec.meta.trueStitches, truth > 0 {
    line += "  fasit \(truth) (\(fmt((estimate - Double(truth)) / Double(truth) * 100, 0)) %)"
    line += "  · k som ville gitt fasit: \(fmt(Double(base.stitchTimes.count) / Double(truth)))"
}
print(line)
if let sp = split {
    let before = base.stitchTimes.filter { $0 < sp.t }.count
    let after = base.stitchTimes.count - before
    let kb = Double(before) / Double(max(1, sp.before)), ka = Double(after) / Double(max(1, sp.after))
    print("Splitt ved \(fmt(sp.t, 1)) s: før \(before) sykler / \(sp.before) masker = \(fmt(kb)) per maske, etter \(after) / \(sp.after) = \(fmt(ka)) per maske (avvik \(fmt((ka / kb - 1) * 100, 0)) %)")
}

var i = 2
var plotRange: ClosedRange<Double>? = nil
var plotAxes = false
while i < args.count {
    switch args[i] {
    case "--k", "--threshold":
        i += 1
    case "--split":
        i += 3
    case "--axes":
        plotAxes = true
    case "--range":
        let a = Double(args[i + 1]) ?? 0, b = Double(args[i + 2]) ?? 0
        plotRange = min(a, b)...max(a, b)
        i += 2
    case "--plot":
        i += 1
        plot(rec, replayed: base.stitchTimes, to: args[i], range: plotRange, axes: plotAxes)
    case "--csv":
        i += 1
        var out = "t,gyro_mag,acc_mag,gx,gy,gz,ax,ay,az,detected_live,replayed,marker\n"
        let live = Set(rec.detectedStitchTimes.map { Int($0 * rate) })
        let rep = Set(base.stitchTimes.map { Int($0 * rate) })
        let mark = Set(rec.markerTimes.map { Int($0 * rate) })
        let gm = gyroMag(rec), am = accMag(rec)
        for k in 0..<rec.t.count {
            let idx = Int(rec.t[k] * rate)
            let flags = [live.contains(idx), rep.contains(idx), mark.contains(idx)].map { $0 ? "1" : "0" }.joined(separator: ",")
            let cols: [String] = ["\(rec.t[k])", fmt(gm[k], 4), fmt(am[k], 4),
                                  "\(rec.gx[k])", "\(rec.gy[k])", "\(rec.gz[k])",
                                  "\(rec.ax[k])", "\(rec.ay[k])", "\(rec.az[k])", flags]
            out += cols.joined(separator: ",") + "\n"
        }
        try out.write(toFile: args[i], atomically: true, encoding: .utf8)
        print("CSV skrevet til \(args[i])")
    default:
        print("ukjent flagg \(args[i])")
    }
    i += 1
}
