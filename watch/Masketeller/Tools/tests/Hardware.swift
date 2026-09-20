import Foundation
final class MotionTracker {
    struct Update { var cycleTimes: [Double]; var events: [DetectorEvent]; var snapshot: DetectorSnapshot; var gapBoundary: Double? = nil }
    static let sampleRate = 50.0
    static var latest: MotionTracker?
    var onUpdate: ((Update) -> Void)?
    var isAvailable = true
    init(config: CycleCounterConfig) { Self.latest = self }
    func update(config: CycleCounterConfig) {}
    func start() {}
    func cancelShadow(at time: Double, reason: String) {}
    func stop() {}
    func resetDetector() {}
    func detachRecorder() {}
    func setRecorder(_ rec: MotionRecorder?, completion: (() -> Void)? = nil) { completion?() }
}
final class WorkoutKeeper {
    enum State { case idle }
    var onStateChange: ((State) -> Void)?
    func start() async {}
    func stop() {}
}
enum Haptics {
    static var onPlay: ((String) -> Void)?
    static func adjust() {}; static func started() {}; static func stopped() {}; static func failure() {}
    static func newRow() {}; static func rowComplete() {}; static func colorChange() {}; static func tenStitches() {}; static func stitch() {}
}
struct SharedPosition: Equatable { var patternId: String; var round: Int; var completed: Int }
final class WatchSync {
    var conflict: Int?
    var linked = false
    var onRemote: ((SharedPosition) -> Void)?
    func start() {}
    func local(_ position: SharedPosition) {}
}
