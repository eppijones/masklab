#!/bin/zsh
# Read-only device acquisition. Each attempt gets a new directory, including failures.
set -euo pipefail
HERE=${0:A:h}
DEST="$HERE/../recordings"
mkdir -p "$DEST"
DEVICE=${MASKETELLER_DEVICE_ID:-$(xcrun devicectl list devices --hide-headers 2>/dev/null | awk '/Apple Watch/ && /connected|available/ && !/unavailable/ {for(i=1;i<=NF;i++) if ($i ~ /^[0-9A-F]{8}-/) {print $i; exit}}')}
if [[ -z "$DEVICE" ]]; then
  echo 'Fant ingen tilkoblet Apple Watch. Lås opp klokka og koble iPhone til Mac.' >&2
  exit 1
fi
ACQUISITION=$(mktemp -d "$DEST/acquisition-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
echo "Henter opptak til $ACQUISITION/original"
if ! xcrun devicectl device copy from --device "$DEVICE" \
  --domain-type appDataContainer --domain-identifier no.espenhorne.Masketeller \
  --source Documents/recordings --destination "$ACQUISITION/original"; then
  echo 'Overføringen feilet. Ufullstendige kopier er bevart; neste forsøk får en ny mappe.' >&2
  exit 1
fi
python3 - "$ACQUISITION" <<'PY'
import hashlib,json,pathlib,sys,tarfile
root=pathlib.Path(sys.argv[1]);rows=[]
for file in sorted((root/'original').rglob('*')):
 if file.is_file():rows.append(dict(path=str(file.relative_to(root/'original')),bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
manifest=root/'sha256-manifest.json'
with manifest.open('x') as f:json.dump(rows,f,indent=2)
archive=root/'immutable-originals.tar.gz'
with tarfile.open(archive,'x:gz') as t:t.add(root/'original',arcname='original')
with tarfile.open(archive) as t:
 for row in rows:assert hashlib.sha256(t.extractfile('original/'+row['path']).read()).hexdigest()==row['sha256']
for file in [archive,manifest]:file.chmod(0o444)
print(f'Verified {len(rows)} files; archive SHA256 {hashlib.sha256(archive.read_bytes()).hexdigest()}')
PY
if [[ "$(uname)" == Darwin ]]; then
  chflags uchg "$ACQUISITION/immutable-originals.tar.gz" "$ACQUISITION/sha256-manifest.json"
fi
echo "Originalkopi og verifisert backup: $ACQUISITION"
