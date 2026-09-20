#!/usr/bin/env python3
"""Recover schema 5/6 checkpoints without changing source evidence.
Default: fail closed on corruption or missing chunks. --salvage explicitly skips
bad chunks and emits an integrity sidecar; recovered truth is always unknown.
"""
import argparse,datetime,hashlib,json,math,pathlib
RAW='t ax ay az gx gy gz grx gry grz'.split()
OPTIONAL='qw qx qy qz'.split()
EVENTS='shadowEvents candidateEvents counterEvents detectedStitchTimes pauseTimes resumeTimes markerTimes'.split()
def recover(folder,output,salvage=False):
    if output.exists() or output.with_suffix('.integrity.json').exists():raise ValueError('Output exists; choose a new path')
    manifest=json.loads((folder/'manifest.json').read_text())
    settings=json.loads((folder/'start-settings.json').read_text())
    r={key:[] for key in RAW+OPTIONAL+EVENTS}; issues=[]; hashes=[]; expected=0
    for file in sorted(folder.glob('raw-*.json')):
        data=file.read_bytes();hashes.append(dict(file=file.name,sha256=hashlib.sha256(data).hexdigest()))
        index=int(file.stem.split('-')[1])
        if index!=expected:
            issues.append(dict(file=file.name,error=f'missing chunk before {index}, expected {expected}'))
            if not salvage:raise ValueError(issues[-1])
        expected=index+1
        try:
            chunk=json.loads(data);n=len(chunk['t'])
            if not n:raise ValueError('empty raw chunk')
            for k in RAW:
                if len(chunk[k])!=n or any(not isinstance(v,(int,float)) or not math.isfinite(v) for v in chunk[k]):raise ValueError('invalid column '+k)
            for k in OPTIONAL:
                values=chunk.get(k,[])
                if values and (len(values)!=n or any(not math.isfinite(v) for v in values)):raise ValueError('invalid quaternion '+k)
            times=([r['t'][-1]] if r['t'] else [])+chunk['t']
            if any(b<=a for a,b in zip(times,times[1:])):raise ValueError('nonmonotonic samples')
            for key in EVENTS:
                if not isinstance(chunk.get(key,[]),list):raise ValueError('invalid events '+key)
        except (ValueError,KeyError,TypeError) as e:
            issues.append(dict(file=file.name,error=str(e)))
            if not salvage:raise ValueError(issues[-1]) from e
            continue
        for key in r:r[key].extend(chunk.get(key,[]))
    if not r['t']:raise ValueError('No checkpointed samples')
    final_events=folder/'final-events.json'
    if final_events.exists():
        tail=json.loads(final_events.read_text())
        for key in EVENTS:
            values=tail.get(key,[])
            if not isinstance(values,list):raise ValueError('invalid final event column '+key)
            r[key].extend(values)
    start=datetime.datetime.fromisoformat(manifest['startedAt'].replace('Z','+00:00'))
    events=r['counterEvents'];first=events[0] if events else {};last=events[-1] if events else {}
    shown=last.get('stitches',0)-first.get('stitches',0)
    meta=dict(version=manifest.get('version',5),algorithmVersion=manifest['algorithmVersion'],sampleRate=manifest.get('sampleRate',50),
        startedAt=manifest['startedAt'],endedAt=(start+datetime.timedelta(seconds=r['t'][-1])).isoformat().replace('+00:00','Z'),
        settings=settings,device='recovered-partial',detectedStitches=shown,displayedStitches=shown,trueStitches=None,
        cycles=len(r['detectedStitchTimes']),cyclesPerStitch=manifest['startK'],startK=manifest['startK'],chosenWrist=settings.get('physicalWrist'),truthProvenance='unknown',
        startRound=first.get('round'),startStitchInRow=first.get('stitchInRow'),endRound=last.get('round'),endStitchInRow=last.get('stitchInRow'),note='Recovered checkpointed evidence; completeness not guaranteed')
    if (folder/'final-meta.json').exists():meta.update(json.loads((folder/'final-meta.json').read_text()))
    for key in ['recordingID','build','sessionID','startCore','startCycles','detectorConfiguration','modelVersion','timeOriginUptime','shadowConfiguration','yarnCondition']:
        if key in manifest:meta[key]=manifest[key]
    if issues:meta.update(trueStitches=None,truthProvenance='unknown-corrupt-partial',note='Salvaged with missing evidence; consult integrity sidecar')
    r['meta']=meta
    report=dict(source=str(folder),chunks=hashes,issues=issues,samples=len(r['t']),hasStopEvent=any(e['kind']=='stop' for e in events),hasFinalMetadata=(folder/'final-meta.json').exists(),completeness='unknown: last uncheckpointed samples cannot be proven',gaps=[dict(before=a,after=b) for a,b in zip(r['t'],r['t'][1:]) if b-a>0.1])
    with output.open('x') as out:json.dump(r,out,separators=(',',':'))
    report['recoveredSHA256']=hashlib.sha256(output.read_bytes()).hexdigest()
    with output.with_suffix('.integrity.json').open('x') as out:json.dump(report,out,indent=2)
    return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('folder',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--salvage',action='store_true');a=p.parse_args();r=recover(a.folder,a.output,a.salvage);print(f'Recovered {r["samples"]} samples; {len(r["issues"])} integrity issues; originals retained')
