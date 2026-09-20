import WatchKit

enum Haptics {
    static var onPlay: ((String) -> Void)?
    private static func play(_ type: WKHapticType, _ name: String) {
        onPlay?(name)
        WKInterfaceDevice.current().play(type)
    }
    static func stitch() { play(.click, ".click") }
    static func tenStitches() { play(.directionUp, ".directionUp") }
    static func rowComplete() { play(.success, ".success") }
    static func newRow() { play(.notification, ".notification") }
    static func started() { play(.start, ".start") }
    static func stopped() { play(.stop, ".stop") }
    static func adjust() { play(.click, ".click") }
    static func failure() { play(.failure, ".failure") }
    /// Tydelig dobbelt-dunk: neste maske har ny farge.
    static func colorChange() {
        let device = WKInterfaceDevice.current()
        onPlay?("color-change")
        device.play(.directionDown)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { onPlay?("color-change-second"); device.play(.directionDown) }
    }
}
