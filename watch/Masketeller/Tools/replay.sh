#!/bin/zsh
# Spiller av et opptak fra klokka gjennom detektoren på Mac.
#   Tools/replay.sh recordings/rec-….json [--plot out.png] [--csv out.csv]
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../Masketeller/Motion"
BIN="$HERE/.build/replay"
mkdir -p "$HERE/.build"

NEEDS_BUILD=0
if [[ ! -x "$BIN" ]]; then NEEDS_BUILD=1; fi
for f in "$SRC/SignalFilters.swift" "$SRC/CycleCounter.swift" "$SRC/../Model/Settings.swift" "$HERE/replay/main.swift"; do
  if [[ "$f" -nt "$BIN" ]]; then NEEDS_BUILD=1; fi
done
if [[ $NEEDS_BUILD == 1 ]]; then
  swiftc -O -o "$BIN" \
    "$SRC/SignalFilters.swift" "$SRC/CycleCounter.swift" "$SRC/../Model/Settings.swift" \
    "$HERE/replay/main.swift" 2>&1 | grep -v "warning:" || true
  [[ -x "$BIN" ]] || { echo "Kompilering feilet" >&2; exit 1; }
fi
exec "$BIN" "$@"
