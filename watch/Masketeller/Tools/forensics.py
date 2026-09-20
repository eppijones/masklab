#!/usr/bin/env python3
"""Read-only recording audit. Labels remain external, bound to content SHA256.
No marker, correction or inferred pause is an individual stitch timestamp.
Usage: forensics.py recording.json output-directory [--truth 118]
"""
import argparse, collections, csv, hashlib, json, math, pathlib, statistics

def audit(path, out, truth=None):
    raw=path.read_bytes(); r=json.loads(raw); t=r['t']; n=len(t)
    out.mkdir(parents=True,exist_ok=True)
    columns='ax ay az gx gy gz grx gry grz'.split()
    errors=[]
    for k in ['t']+columns:
        if len(r.get(k,[]))!=n: errors.append(f'{k}: unequal length')
        if any(not isinstance(v,(int,float)) or not math.isfinite(v) for v in r.get(k,[])):errors.append(f'{k}: nonfinite')
    gaps=[{'before':a,'after':b,'duration':b-a} for a,b in zip(t,t[1:]) if b-a>0.1]
    if any(b<=a for a,b in zip(t,t[1:])):errors.append('nonmonotonic timestamps')
    if errors:raise ValueError(errors)
    events=r.get('counterEvents',[]); candidates=r.get('candidateEvents',[])
    auto=[e for e in events if e['kind']=='auto']
    markers=[]
    for i,tm in enumerate(r.get('markerTimes',[])):
        previous=[e for e in events if e['t']<=tm]
        e=previous[-1] if previous else {}
        markers.append(dict(index=i+1,time=tm,displayed=e.get('stitches'),round=e.get('round'),completed=e.get('stitchInRow'),labelStrength='unassigned boundary',physicalCompleted=None))
    timeline=[]
    for e in events:timeline.append(dict(time=e['t'],type='counter',detail=e))
    for e in candidates:timeline.append(dict(time=e['eventTime'],type='candidate',detail=e))
    for m in markers:timeline.append(dict(time=m['time'],type='marker',detail=m))
    for kind in ['pauseTimes','resumeTimes']:
        for tm in r.get(kind,[]):timeline.append(dict(time=tm,type=kind,detail={}))
    timeline.sort(key=lambda e:e['time'])
    with (out/'timeline.jsonl').open('w') as f:
        for e in timeline:f.write(json.dumps(e)+'\n')
    # Temporal bins describe signal activity, never semantic hand actions.
    bins=[]
    for start in range(0,math.ceil(t[-1]),10):
        ix=[i for i,tm in enumerate(t) if start<=tm<start+10]
        if not ix:continue
        gyro=[math.sqrt(sum(r[k][i]**2 for k in ['gx','gy','gz'])) for i in ix]
        accel=[math.sqrt(sum(r[k][i]**2 for k in ['ax','ay','az'])) for i in ix]
        bins.append(dict(start=start,end=min(start+10,t[-1]),gyroRMS=math.sqrt(statistics.mean(v*v for v in gyro)),accelerationRMS=math.sqrt(statistics.mean(v*v for v in accel)),cycles=sum(start<=v<start+10 for v in r.get('detectedStitchTimes',[])),auto=sum(start<=e['t']<start+10 for e in auto)))
    with (out/'signal-10s.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(bins[0]));writer.writeheader();writer.writerows(bins)
    delta=[b-a for a,b in zip(t,t[1:])]
    latency=[e['decisionTime']-e['eventTime'] for e in auto if e.get('eventTime') is not None and e.get('decisionTime') is not None]
    result=dict(file=path.name,sha256=hashlib.sha256(raw).hexdigest(),meta=r['meta'],samples=n,sensorDuration=t[-1]-t[0],firstSample=t[0],lastSample=t[-1],medianHz=1/statistics.median(delta),gapsOver100ms=gaps,integrityErrors=errors,quaternionAvailable=all(len(r.get(k,[]))==n for k in ['qw','qx','qy','qz']),counterKinds=dict(collections.Counter(e['kind'] for e in events)),candidateReasons=dict(collections.Counter(e['reason'] for e in candidates)),acceptedCycles=len(r.get('detectedStitchTimes',[])),automaticCount=len(auto),hardSessionTruth=truth,netCountError=None if truth is None else len(auto)-truth,absoluteCountError=None if truth is None else abs(len(auto)-truth),absolutePercentageError=None if truth is None else 100*abs(len(auto)-truth)/truth,markers=markers,firstCounter=events[0] if events else None,lastCounter=events[-1] if events else None,decisionDeliveryLatencyMs={'median':1000*statistics.median(latency),'max':1000*max(latency)} if latency else None,physicalCompletionLatency=None,individualMisses=None,individualDuplicates=None,limitations=['Net count error cannot separate misses and duplicates.','Motion bins cannot identify yarn handling versus crochet without temporal labels.','Recovered files have unknown build unless corroborated externally.','Markers are boundaries; their physical counts require independent provenance.'])
    (out/'audit.json').write_text(json.dumps(result,indent=2)+'\n')
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('recording',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--truth',type=int);a=p.parse_args();r=audit(a.recording,a.output,a.truth);print(json.dumps({k:r[k] for k in ['sha256','samples','sensorDuration','automaticCount','netCountError','candidateReasons','decisionDeliveryLatencyMs']},indent=2))
