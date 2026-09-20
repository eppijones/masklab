#!/usr/bin/env python3
"""
Analyserer om «maske ferdig»-bevegelsen har en gjenkjennbar signatur.

Bruker markørene (brukerens trykk rett etter hver maske) som fasit:
  1. Klipper ut et vindu før hver markør og lager en gjennomsnittsmal (template)
     per sensorkanal (gyro x/y/z, akselerasjon x/y/z), nedsamplet til 10 Hz.
  2. Leave-one-out: for hver markør lages malen av de andre markørene, og vi
     sjekker om normalisert krysskorrelasjon finner nettopp denne markøren.
  3. Sveiper terskel og rapporterer presisjon/recall innenfor de markerte
     strekkene, så vi ser om signaturen er sterk nok til å telle på.

Bruk:  gesture-analyze.py rec.json [--pre 4.0] [--post 0.5] [--tol 1.5]
"""
import json, math, sys

RATE_IN = 50
RATE = 10                      # analysefrekvens
DEC = RATE_IN // RATE

def load(path):
    with open(path) as f:
        return json.load(f)

def downsample(x):
    out = []
    for i in range(0, len(x) - DEC + 1, DEC):
        out.append(sum(x[i:i + DEC]) / DEC)
    return out

def zscore(v):
    m = sum(v) / len(v)
    sd = math.sqrt(sum((a - m) ** 2 for a in v) / len(v)) or 1e-9
    return [(a - m) / sd for a in v]

def ncc(window, template):
    """Normalisert krysskorrelasjon mellom to like lange, flerkanals vinduer."""
    num = 0.0; e1 = 0.0; e2 = 0.0
    for ch in range(len(template)):
        w = window[ch]; t = template[ch]
        mw = sum(w) / len(w)
        for a, b in zip(w, t):
            a -= mw
            num += a * b; e1 += a * a; e2 += b * b
    d = math.sqrt(e1 * e2)
    return num / d if d > 1e-9 else 0.0

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(2)
    path = args[0]
    pre = 4.0; post = 0.5; tol = 1.5
    for i, a in enumerate(args):
        if a == "--pre": pre = float(args[i + 1])
        if a == "--post": post = float(args[i + 1])
        if a == "--tol": tol = float(args[i + 1])

    r = load(path)
    chans = {k: downsample(r[k]) for k in ("gx", "gy", "gz", "ax", "ay", "az")}
    n = len(chans["gx"])
    t = [i / RATE for i in range(n)]
    markers = [m for m in r["markerTimes"] if m > pre and m < t[-1] - post]
    print(f"Opptak {path}: {t[-1]:.0f} s, {len(markers)} brukbare markører, fasit {r['meta'].get('trueStitches')}")

    # Aktive strekk = mellom første og siste markør i hver klynge (avstand < 60 s)
    clusters = []
    for m in markers:
        if clusters and m - clusters[-1][-1] < 60:
            clusters[-1].append(m)
        else:
            clusters.append([m])
    segments = [(c[0] - pre, c[-1] + post) for c in clusters if len(c) >= 3]
    print("Markerte strekk:", ", ".join(f"{a:.0f}–{b:.0f} s ({len(c)} m)" for (a, b), c in zip(segments, [c for c in clusters if len(c) >= 3])))

    win = int((pre + post) * RATE)
    keys = list(chans.keys())

    def window_at(end_idx):
        s = end_idx - win
        if s < 0 or end_idx > n: return None
        return [chans[k][s:end_idx] for k in keys]

    def template_from(ms):
        acc = [[0.0] * win for _ in keys]
        cnt = 0
        for m in ms:
            w = window_at(int((m + post) * RATE))
            if w is None: continue
            for ch in range(len(keys)):
                z = zscore(w[ch])
                for j in range(win): acc[ch][j] += z[j]
            cnt += 1
        return [[v / max(1, cnt) for v in ch] for ch in acc]

    # Hvor konsistente er markørvinduene med hverandre? (leave-one-out NCC mot malen)
    self_scores = []
    for i, m in enumerate(markers):
        tpl = template_from(markers[:i] + markers[i + 1:])
        w = window_at(int((m + post) * RATE))
        if w: self_scores.append(ncc(w, tpl))
    self_scores.sort()
    print(f"Markørvindu vs mal (leave-one-out NCC): median {self_scores[len(self_scores)//2]:.2f}, "
          f"min {self_scores[0]:.2f}, maks {self_scores[-1]:.2f}")

    # Kryssvalidering: malen for et strekk lages av markørene i de ANDRE strekkene,
    # så vi ikke tester på det vi trente på. (Med bare ett strekk: leave-one-out.)
    big = [c for c in clusters if len(c) >= 3]
    tpl_cache = {}
    scores = []   # (tid, ncc)
    for end in range(win, n):
        te = t[end - 1] - post
        seg_i = next((i for i, (a, b) in enumerate(segments) if a <= te <= b), None)
        if seg_i is None: continue
        if len(big) == 1:
            tpl = template_from([m for m in big[0] if abs(m - te) > tol])
        else:
            if seg_i not in tpl_cache:
                tpl_cache[seg_i] = template_from([m for j, c in enumerate(big) if j != seg_i for m in c])
            tpl = tpl_cache[seg_i]
        scores.append((te, ncc(window_at(end), tpl)))
    print(f"Kryssvalidering: {'strekk mot strekk' if len(big) > 1 else 'leave-one-out'}, vindu {-pre:+.1f}…{post:+.1f} s rundt markør")
    bg = sorted(s for te, s in scores if all(abs(te - m) > tol for m in markers))
    print(f"Bakgrunn (ikke nær markør): median {bg[len(bg)//2]:.2f}, p90 {bg[int(len(bg)*0.9)]:.2f}, p99 {bg[int(len(bg)*0.99)]:.2f}")

    # Deteksjon: topper i NCC over terskel, refraktær 3 s. Presisjon/recall mot markører.
    print("\nterskel  funnet  treff  presisjon  recall   (innenfor markerte strekk)")
    best = None
    for th in [x / 100 for x in range(20, 80, 5)]:
        det = []
        last = -1e9
        for i in range(1, len(scores) - 1):
            te, s = scores[i]
            if s > th and s >= scores[i - 1][1] and s > scores[i + 1][1] and te - last > 3.0:
                det.append(te); last = te
        hits = sum(1 for m in markers if any(abs(d - m) <= tol for d in det))
        prec = hits / len(det) if det else 0
        rec = hits / len(markers)
        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
        if best is None or f1 > best[0]: best = (f1, th, len(det), hits)
        print(f"{th:.2f}     {len(det):4d}    {hits:3d}    {prec:5.2f}     {rec:5.2f}")
    print(f"\nBeste F1 {best[0]:.2f} ved terskel {best[1]:.2f}: {best[2]} funnet, {best[3]} av {len(markers)} markører treffer")
    print("Tolkning: presisjon ≈ 1 og recall ≈ 1 betyr at «maske ferdig» har en klar signatur på denne armen.")
    print("          Lave tall betyr at bevegelsen ikke er konsistent nok – da må vi prøve andre arm / andre trekk.")

if __name__ == "__main__":
    main()
