#!/bin/zsh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/.." && pwd)
BIN="$HERE/.build/test-ledger"
mkdir -p "$HERE/.build"
swiftc -parse-as-library -o "$BIN" \
  "$HERE/test-ledger.swift" \
  "$ROOT/Masketeller/Model/StitchLedger.swift" \
  "$ROOT/Masketeller/Model/Pattern.swift"
(cd "$ROOT" && "$BIN")
