import Foundation

/// Enkel førsteordens lavpassfilter (eksponentiell glatting) med gitt knekkfrekvens.
struct OnePoleLowPass {
    private(set) var value: Double = 0
    private var alpha: Double
    private var primed = false

    init(cutoffHz: Double, sampleRate: Double) {
        alpha = OnePoleLowPass.alpha(cutoffHz: cutoffHz, sampleRate: sampleRate)
    }

    static func alpha(cutoffHz: Double, sampleRate: Double) -> Double {
        let dt = 1.0 / sampleRate
        let rc = 1.0 / (2.0 * .pi * cutoffHz)
        return dt / (rc + dt)
    }

    mutating func retune(cutoffHz: Double, sampleRate: Double) {
        alpha = OnePoleLowPass.alpha(cutoffHz: cutoffHz, sampleRate: sampleRate)
    }

    @discardableResult
    mutating func process(_ x: Double) -> Double {
        if !primed {
            value = x
            primed = true
        } else {
            value += alpha * (x - value)
        }
        return value
    }

    mutating func reset() {
        value = 0
        primed = false
    }
}

/// Løpende median over et lite vindu – brukes til å glatte periodeestimatet.
struct RunningMedian {
    private var values: [Double] = []
    let capacity: Int

    init(capacity: Int) { self.capacity = max(1, capacity) }

    mutating func push(_ v: Double) {
        values.append(v)
        if values.count > capacity { values.removeFirst() }
    }

    var median: Double? {
        guard !values.isEmpty else { return nil }
        let sorted = values.sorted()
        let mid = sorted.count / 2
        return sorted.count % 2 == 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }

    var count: Int { values.count }

    mutating func reset() { values.removeAll() }
}
