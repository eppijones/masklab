#!/bin/zsh
set -euo pipefail
HERE=${0:A:h}
mkdir -p "$HERE/.build"
swiftc -O "$HERE/../Masketeller/Motion/CycleCounter.swift" "$HERE/../Masketeller/Model/CountingCore.swift" "$HERE/evaluate/main.swift" -o "$HERE/.build/evaluate"
exec "$HERE/.build/evaluate" "$@"
