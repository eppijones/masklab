"""Reproducible reference slicing; never sends a job to a printer.
Usage: python3 slice-x1.py /absolute/path/BambuStudio.app
Profiles are flattened from that app's official bundled resources. Geometry
is unchanged, with all copies of each part arranged together. Reports are
accepted only when the slicer accounts for every copy with no outside plate.
This is not manufacturing approval; inspect supports and fit before printing.
"""
import collections, hashlib, json, pathlib, subprocess, sys, xml.etree.ElementTree as ET, zipfile
root=pathlib.Path(__file__).resolve().parent
app=pathlib.Path(sys.argv[1]).resolve()
profiles=app/'Contents/Resources/profiles/BBL'
index={p.stem:p for p in profiles.rglob('*.json')}
out=root/'research/x1-slicing'; out.mkdir(parents=True,exist_ok=True)
def flatten(name,chain=()):
    if name in chain: raise ValueError('Circular profile inheritance')
    data=json.loads(index[name].read_text()); result={}
    if data.get('inherits'): result.update(flatten(data['inherits'],chain+(name,)))
    for include in data.get('include',[]):result.update(flatten(include,chain+(name,)))
    result.update(data)
    for key in ('inherits','include'):result.pop(key,None)
    return result
def save(name,data):
    path=out/(name+'.json');path.write_text(json.dumps(data,indent=2)+'\n');return str(path)
machine=save('machine',flatten('Bambu Lab X1 Carbon 0.4 nozzle'))
base=flatten('0.20mm Standard @BBL X1C')
filaments={m:save(m,flatten('Generic '+m)) for m in ('PETG','PLA','TPU')}
manifest=json.loads((root/'public/manifest.json').read_text())
parts=[p for p in manifest['parts'] if p['fullQty']['installed']+p['fullQty']['spare']>0]
plates=[]; failures=[]; warnings=[];versions=set(); hashes={}
for part in parts:
    id=part['id'];qty=part['fullQty']['installed']+part['fullQty']['spare'];cfg=part['print'];path=root/'public'/part['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==part['sha256']
    hashes[id]=part['sha256']
    process={**base,'layer_height':str(cfg['layerMm']),'wall_loops':str(cfg['walls']),'sparse_infill_density':str(cfg['infillPct'])+'%',
        'sparse_infill_pattern':'zig-zag' if cfg['infillPct']==100 else base['sparse_infill_pattern'],
        'enable_support':'1','support_type':'normal(auto)','support_style':'default','support_on_build_plate_only':'0','brim_type':'auto_brim'}
    process_path=save(id+'-process',process)
    args=[str(app/'Contents/MacOS/BambuStudio'),'--debug','2','--load-settings',machine+';'+process_path,'--load-filaments',filaments[cfg['material']],
        '--curr-bed-type','Textured PEI Plate','--arrange','1','--slice','0','--export-3mf',id+'.gcode.3mf','--outputdir',str(out)]+[str(path)]*qty
    with (out/(id+'.log')).open('w') as log:run=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,timeout=600)
    logs=(out/(id+'.log')).read_text()
    relevant=[l for l in logs.splitlines() if 'slicing warning' in l or '[error]' in l]
    if relevant:warnings.append({'part':id,'messages':relevant})
    if run.returncode:
        failures.append({'part':id,'exitCode':run.returncode});print(id,'FAILED',run.returncode,flush=True);continue
    with zipfile.ZipFile(out/(id+'.gcode.3mf')) as f:
        settings=json.loads(f.read('Metadata/project_settings.config'))
        assert settings['printer_model']=='Bambu Lab X1 Carbon'
        assert settings['nozzle_diameter']==['0.4']
        assert settings['filament_type']==[cfg['material']]
        assert float(settings['layer_height'])==cfg['layerMm']
        assert int(settings['wall_loops'])==cfg['walls']
        assert settings['sparse_infill_density']==str(cfg['infillPct'])+'%'
        assert settings['enable_support']=='1'
        assert settings['curr_bed_type']=='Textured PEI Plate'
        assert settings['printable_area']==['0x0','256x0','256x256','0x256']
        assert settings['bed_exclude_area']==['0x0','18x0','18x28','0x28']
        xml=ET.fromstring(f.read('Metadata/slice_info.config'))
        for header in xml.findall('header/header_item'):
            if header.get('key')=='X-BBL-Client-Version':versions.add(header.get('value'))
        covered=0
        for plate in xml.findall('plate'):
            meta={e.get('key'):e.get('value') for e in plate.findall('metadata')}
            objects=[e for e in plate.findall('object') if e.get('skipped')=='false']
            if not objects:continue
            n=len(objects);covered+=n
            assert all(e.get('name')==id+'.stl' for e in objects)
            assert meta['outside']=='false',(id,meta)
            grams=sum(float(e.get('used_g')) for e in plate.findall('filament'))
            seconds=float(meta['prediction']);assert grams>0 and seconds>0
            plates.append({'id':id+'-'+meta['index'],'material':cfg['material'],'grams':grams,'hours':seconds/3600,'contents':{id:n}})
        assert covered==qty,(id,covered,qty)
    print(id,qty,'OK',flush=True)
report={'revision':manifest['revision'],'scope':'full','printer':'Bambu Lab X1 Carbon','nozzleMm':.4,'nozzleConfirmed':False,'slicerVersion':', '.join(sorted(versions)),
    'profile':'X1C 0.4 / Generic PETG, PLA, TPU / Textured PEI / part-specific layers, walls and infill / automatic normal supports and brim',
    'basis':'Bambu Studio prediction for RO RO RO reference parts, not a tested manufacturing release. No printer connection.',
    'layout':'All copies of each distinct part sliced together; separate parts on separate jobs. Not optimized across part types.',
    'printed':False,'generatedAt':'2026-10-04','sha256':hashes,'failures':failures,'warnings':warnings,'plates':plates}
save('report',report)
print('TOTAL',sum(p['grams'] for p in plates),'g',sum(p['hours'] for p in plates),'hours',len(plates),'plates',len(failures),'failures',flush=True)
if failures:sys.exit(1)
(root/'public/x1-reference-slice.json').write_text(json.dumps(report,indent=2)+'\n')
