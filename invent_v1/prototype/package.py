"""Package experiment models; 3MF contains geometry only, not slicer settings."""
import json
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
HANDOFF = ROOT / 'handoff'
data = json.loads((PUBLIC / 'manifest.json').read_text())
parts = [p for p in data['parts'] if p['fitQty']]

def mesh_xml(path):
    binary = path.read_bytes()
    count = struct.unpack_from('<I', binary, 80)[0]
    verts, triangles, lookup = [], [], {}
    for i in range(count):
        indices = []
        for j in range(3):
            xyz = struct.unpack_from('<3f', binary, 84 + i * 50 + 12 + j * 12)
            key = tuple(round(v, 5) for v in xyz)
            if key not in lookup:
                lookup[key] = len(verts)
                verts.append(key)
            indices.append(lookup[key])
        triangles.append(indices)
    vertices = ''.join(f'<vertex x="{x}" y="{y}" z="{z}"/>' for x, y, z in verts)
    faces = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in triangles)
    return f'<mesh><vertices>{vertices}</vertices><triangles>{faces}</triangles></mesh>'

resources, items = [], []
positions = {
    'fit-rack-r1': [(80, 30)],
    'gate-6': [(30, 75)], 'gate-7': [(55, 75)], 'gate-7p5': [(80, 75)],
    'gate-8': [(105, 75), (130, 75)], 'crochet-hook': [(60, 110), (100, 110)],
}
for index, p in enumerate(parts, 1):
    resources.append(f'<object id="{index}" type="model" name="{escape(p["id"])}">{mesh_xml(PUBLIC / p["file"])}</object>')
    assert len(positions[p['id']]) == p['fitQty']
    for x, y in positions[p['id']]:
        assert 0 <= x - p['bbox'][0] / 2 and x + p['bbox'][0] / 2 <= 160
        assert 0 <= y - p['bbox'][1] / 2 and y + p['bbox'][1] / 2 <= 140
        items.append(f'<item objectid="{index}" transform="1 0 0 0 1 0 0 0 1 {x} {y} 0"/>')
model = f'''<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">HEKLOMAT R1 manual fit kit — GEOMETRY ONLY</metadata>
<metadata name="Description">Eight pieces. Select your own printer profile, inspect all layers, add needed brims/supports. Not a working machine.</metadata>
<resources>{''.join(resources)}</resources><build>{''.join(items)}</build></model>'''
with zipfile.ZipFile(HANDOFF / 'fit-kit-geometry-only.3mf', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
    z.writestr('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
    z.writestr('3D/3dmodel.model', model)

# Dimensioned plan generated from the same socket data as the CAD.
sockets = data['sockets']
shapes = '<rect x="0" y="0" width="120" height="40" rx="3" fill="#e9eddf" stroke="#274b3a" stroke-width=".4"/>'
for x in (8, 112):
    for y in (8, 32):
        shapes += f'<circle cx="{x}" cy="{y}" r="2.25" fill="white" stroke="#274b3a" stroke-width=".3"/>'
for i, s in enumerate(sockets):
    x, y = s['x'] + 60, s['y'] + 20
    shapes += f'<rect x="{x-s["width"]/2}" y="{y-s["depth"]/2}" width="{s["width"]}" height="{s["depth"]}" fill="white" stroke="#274b3a" stroke-width=".3"/>'
    for j in range(i+1):
        shapes += f'<circle cx="{x+(j-i/2)*2.5}" cy="29" r=".7" fill="#274b3a"/>'
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 520" role="img" aria-label="Dimensioned calibration rack drawing">
<rect width="820" height="520" fill="#fbfcf7"/><g font-family="Arial,sans-serif" fill="#274b3a">
<text x="35" y="38" font-size="19">HEKLOMAT · gate socket calibration rack R1</text><text x="35" y="63" font-size="12">Nominal dimensions in mm · manual fit experiment · print shrinkage must be measured</text>
<g transform="translate(100 140) scale(5)">{shapes}</g>
<path d="M100 125 V103 H700 V125 M82 140 H62 V340 H82" stroke="#274b3a" fill="none"/>
<text x="388" y="97" font-size="15">120</text><text x="35" y="244" font-size="15">40</text>
<text x="100" y="370" font-size="13">4 × Ø4.5 mounting holes · hole centres 104 × 24 · thickness 8</text>
<text x="100" y="398" font-size="13">Socket index (dots):      1             2             3             4             5</text>
<text x="100" y="422" font-size="13">Width:                         8.15        8.25        8.35        8.45        8.55</text>
<text x="100" y="446" font-size="13">Depth in plan:             2.75        2.85        2.95        3.05        3.15</text>
<text x="100" y="476" font-size="13">All pockets open from above; insertion depth 4.2. Nominal tongue: 8 × 2.6 × 4.</text>
<text x="100" y="502" font-size="11">Source: fit-kit.ts / SOCKETS · view not a machine-ready working comb</text></g></svg>'''
(HANDOFF / 'fit-rack-drawing.svg').write_text(svg)
(PUBLIC / 'fit-rack-drawing.svg').write_text(svg)
for folder in (PUBLIC, HANDOFF):
    path = folder / 'START-HERE.html'
    html = path.read_text()
    if '<img ' not in html:
        html = html.replace('<h2>Assembly and experiment</h2>', '<h2>Assembly and experiment</h2><img src="fit-rack-drawing.svg" alt="Dimensioned rack drawing" style="width:100%;max-width:820px"/>')
    path.write_text(html)

def archive(path, files):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for src, name in files:
            z.write(src, name)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None

archive(PUBLIC / 'fit-kit-r1.zip', [(p, str(p.relative_to(HANDOFF))) for p in sorted(HANDOFF.rglob('*')) if p.is_file()])
review = [(PUBLIC / f, f) for f in ['DESIGN-REVIEW.html', 'START-HERE.html', 'fit-rack-drawing.svg', 'manifest.json', 'quote-template.json', 'quote-whole-machine.json', 'quote-format-example.json']]
review.append((PUBLIC/'x1-reference-slice.json','x1-reference-slice.json'))
for folder in ['print', 'geometry']:
    review += [(p, str(p.relative_to(PUBLIC))) for p in sorted((PUBLIC / folder).glob('*.stl'))]
review.append((ROOT / 'README.md', 'README.md'))
for folder in ['cad', 'parts', 'machine', 'bom', 'guide']:
    review += [(p, f'source/invent_v1/{folder}/{p.name}') for p in sorted((ROOT.parent / folder).glob('*.ts'))]
review += [(p, f'source/invent_v1/prototype/{p.name}') for p in sorted(ROOT.glob('*')) if p.suffix in ['.ts', '.tsx', '.py', '.css'] or p.name in ['index.html', 'tsconfig.json']]
review.append((ROOT.parent / 'data/mandrel-profile.ts', 'source/invent_v1/data/mandrel-profile.ts'))
review.append((ROOT.parent / 'data/hats.json', 'source/invent_v1/data/hats.json'))
review.append((ROOT.parent / 'tools/package.json', 'source/invent_v1/tools/package.json'))
review += [(p, f'source/invent_v1/prototype/procurement/{p.name}') for p in sorted((ROOT/'procurement').glob('*.json'))]
archive(PUBLIC / 'design-review-r1.zip', review)
print(json.dumps({'fitArchiveBytes': (PUBLIC/'fit-kit-r1.zip').stat().st_size, 'reviewArchiveBytes': (PUBLIC/'design-review-r1.zip').stat().st_size, '3mfObjects': len(resources), '3mfPieces':len(items)}, indent=2))
