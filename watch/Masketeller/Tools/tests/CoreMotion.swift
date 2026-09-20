public struct CMVector { public var x = 0.0; public var y = 0.0; public var z = 0.0 }
public struct CMQuaternion { public var x = 0.0; public var y = 0.0; public var z = 0.0; public var w = 1.0 }
public final class CMAttitude { public var quaternion = CMQuaternion() }
public final class CMDeviceMotion {
    public var timestamp = 0.0
    public var userAcceleration = CMVector()
    public var rotationRate = CMVector()
    public var gravity = CMVector()
    public var attitude = CMAttitude()
    public init() {}
}
