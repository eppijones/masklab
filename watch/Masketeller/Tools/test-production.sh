#!/bin/zsh
set -euo pipefail
HERE=${0:A:h}
SRC="$HERE/../Masketeller"
BUILD=$(mktemp -d /tmp/masketeller-tests.XXXXXX)
cp "$SRC/Patterns/ro-ro-ro.json" "$BUILD/ro-ro-ro.json"
swiftc -emit-module -emit-library -module-name WatchKit "$HERE/tests/WatchKit.swift" -o "$BUILD/libWatchKit.dylib" -emit-module-path "$BUILD/WatchKit.swiftmodule"
swiftc -emit-module -emit-library -module-name CoreMotion "$HERE/tests/CoreMotion.swift" -o "$BUILD/libCoreMotion.dylib" -emit-module-path "$BUILD/CoreMotion.swiftmodule"
swiftc -parse-as-library -I "$BUILD" -L "$BUILD" -lWatchKit -lCoreMotion -Xlinker -rpath -Xlinker "$BUILD" \
 "$SRC/Model/CountingCore.swift" "$SRC/Model/CounterModel.swift" "$SRC/Model/Settings.swift" "$SRC/Model/SessionStore.swift" "$SRC/Model/Pattern.swift" "$SRC/Model/AppIdentity.swift" \
 "$SRC/Motion/CycleCounter.swift" "$SRC/Motion/ShadowDetector.swift" "$SRC/Motion/MotionRecorder.swift" "$HERE/tests/Hardware.swift" "$HERE/tests/main.swift" -o "$BUILD/test-production"
"$BUILD/test-production" "$SRC/Patterns/ro-ro-ro.json"
