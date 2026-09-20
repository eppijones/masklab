public enum WKInterfaceDeviceWristLocation { case left, right }
public final class WKInterfaceDevice {
    public static func current() -> WKInterfaceDevice { WKInterfaceDevice() }
    public var wristLocation: WKInterfaceDeviceWristLocation { .left }
}
