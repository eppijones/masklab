"""Create the complete current print inventory as a portable ZIP and HTML overview."""
import hashlib,html,json,pathlib,zipfile
root=pathlib.Path(__file__).resolve().parent;public=root/'public'
data=json.loads((public/'manifest.json').read_text());quote=json.loads((public/'x1-reference-slice.json').read_text())
parts=[p for p in data['parts'] if p['fullQty']['installed']+p['fullQty']['spare']>0]
assert quote['revision']==data['revision']
rows=[];items=[]
for p in parts:
    qty=p['fullQty']['installed']+p['fullQty']['spare']
    assert hashlib.sha256((public/p['file']).read_bytes()).hexdigest()==quote['sha256'][p['id']]
    plates=[v for v in quote['plates'] if set(v['contents'])=={p['id']}]
    assert sum(v['contents'][p['id']] for v in plates)==qty
    grams=sum(v['grams'] for v in plates);hours=sum(v['hours'] for v in plates)
    item={'id':p['id'],'navn':p.get('nameNo',p['name']),'antall':qty,'reserver':p['fullQty']['spare'],'materiale':p['print']['material'],'gram':round(grams,2),'timer':round(hours,4),'sha256':p['sha256'],'fil':p['file']}
    items.append(item)
    rows.append(f'<tr><td>{html.escape(item["navn"])}</td><td>{qty}</td><td>{item["reserver"]}</td><td>{item["materiale"]}</td><td>{grams:.1f}</td><td>{hours:.2f}</td><td><a href="{p["file"]}" download>STL</a> · <a href="https://masklab.vercel.app/heklomat/#del/{p["id"]}">Se i 3D</a></td></tr>')
gram=sum(p['grams'] for p in quote['plates']);hours=sum(p['hours'] for p in quote['plates'])
report=f'''<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Øyvinds printoversikt · HEKLOMAT RO RO RO</title><style>body{{font:15px/1.65 system-ui;color:#294331;background:#fafbf7;max-width:1100px;margin:35px auto;padding:25px}}h1{{font-size:38px;letter-spacing:-1px}}.note{{padding:20px;background:#eee8d8}}table{{border-collapse:collapse;width:100%;font-size:12px}}th,td{{padding:12px 8px;border-bottom:1px solid #d4decf;text-align:left}}a{{color:#315b41}}.table{{overflow:auto}}@media print{{body{{margin:0;padding:0}}tr{{break-inside:avoid}}}}</style>
<h1>Alle printdelene til Øyvind.</h1><p>HEKLOMAT · RO RO RO, 56 cm · revisjon {data['revision']} · 4. oktober 2026</p>
<p><b>Øyvind printer. Espen betaler filamentene.</b> Espen kjøper øvrige deler og garn. Montering utføres av Espen alene eller sammen med Øyvind.</p>
<p class="note"><b>Konstruksjonsgrunnlag, ikke en ferdig byggegodkjenning.</b> ZIP-filen inneholder hele dagens printliste, men maskinen har kjente mekaniske feil og er ikke testbygget. Den nye animerte heklecellen på nettsiden er ikke inkludert som ferdige printfiler. Avklar hvilke deler som skal prøveprintes før en full utskrift. Ingen G-code eller kommando som starter en printer følger med.</p>
<p><b>{len(parts)} STL-filer · {sum(p['antall'] for p in items)} eksemplarer med reserver · {gram:.1f} gram · {hours:.1f} timer.</b> Beregnet med Bambu Studio på X1 Carbon, antatt 0,4 mm dyse. Hver deltype er lagt på egen plate. Støtte og brim er med. Etterarbeid, tørking, platebytte og feilprint kommer i tillegg.</p>
<h2>Slik bruker du pakken</h2><ol><li>Pakk ut ZIP-filen. Åpne STL-filene fra mappen <b>print</b> i Bambu Studio.</li><li>Velg X1 Carbon og faktisk dyse, filament og byggeplate. Alle STL-filer bruker millimeter: behold 100 % størrelse.</li><li>Bruk antallet i oversikten. Lag, vegger, fyll og orientering finnes i <b>manifest.json</b>. De er forslag, ikke fysisk testede profiler.</li><li>Kontroller første lag, overheng, støttens tilgjengelighet og at delene holder sammen. Sammenlign printprogrammets gram og timer med vedlagt beregning.</li><li>Ta vare på kvittering for filament til Espen. Lagre det faktiske printoppsettet som en 3MF-fil etter kontroll.</li></ol>
<h2>Total oversikt</h2><div class="table"><table><thead><tr><th>Del</th><th>Antall</th><th>Reserver</th><th>Materiale</th><th>Gram</th><th>Timer</th><th>Fil / modell</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p><a href="https://masklab.vercel.app/heklomat/#print">Åpne den samlede nettsiden</a> · <a href="DESIGN-REVIEW.html">Kjente konstruksjonsavvik</a></p></html>'''
(public/'PRINTOVERSIKT.html').write_text(report)
(public/'printliste-oyvind.json').write_text(json.dumps({'revision':data['revision'],'hatt':'RO RO RO','printer':'Bambu Lab X1 Carbon','printeransvarlig':'Øyvind','filament_betales_av':'Espen','parts':items},ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(public/'heklomat-oyvind-printpakke.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in parts:z.write(public/p['file'],p['file'])
    for name in ['PRINTOVERSIKT.html','printliste-oyvind.json','manifest.json','x1-reference-slice.json','DESIGN-REVIEW.html']:z.write(public/name,name)
with zipfile.ZipFile(public/'heklomat-oyvind-printpakke.zip') as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.stl')])==22
# Preserve the supplied historical text; prefix an explicit current status note.
old=root.parent.parent/'invent/heklomat';patent=(old/'patent.html').read_text()
patent=patent.replace('<link rel="stylesheet" href="assets/style.css">','<style>'+(old/'assets/style.css').read_text()+'</style>')
patent=patent.replace('<div class="wrap">','''<div class="wrap"><aside style="background:#eee8d8;border:2px solid #b78b53;padding:22px;margin-top:25px"><h2 style="margin:0;padding:0;border:0">Historisk patentutkast — ikke et innvilget patent</h2><p>Dette vedlegget er merket «Unfiled evaluation draft». Vi har ikke dokumentasjon på innlevering, søknadsnummer eller innvilgelse. Det beskriver den eldre HEKLOMAT-1-konstruksjonen. Påstander om nyhet, full funksjon og fordeler nedenfor er ikke verifisert; se den kritiske gjennomgangen før videre bruk.</p><p>Offentliggjøring før innlevering kan påvirke muligheten til å få patent. <a href="https://www.patentstyret.no/patent/for-du-soker">Patentstyrets veiledning</a>.</p><a href="./">Til HEKLOMAT</a></aside>''',1)
(public/'patentutkast.html').write_text(patent)
print(json.dumps({'files':len(parts),'copies':sum(p['antall'] for p in items),'grams':gram,'hours':hours,'zipBytes':(public/'heklomat-oyvind-printpakke.zip').stat().st_size}))
