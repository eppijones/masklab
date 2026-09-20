#!/usr/bin/env python3
"""Read-only inventory of immutable exports. Duplicate backups never add sessions."""
import argparse,collections,hashlib,json,pathlib
p=argparse.ArgumentParser();p.add_argument('root',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args()
unique={};errors=[]
for file in sorted(a.root.rglob('*.json')):
 try:
  data=file.read_bytes();r=json.loads(data)
  if not isinstance(r,dict) or not isinstance(r.get('t'),list) or 'meta' not in r:continue
  h=hashlib.sha256(data).hexdigest()
  if h in unique:unique[h]['copies'].append(str(file));continue
  m=r['meta'];times=r['t'];origin=m.get('timeOriginUptime')
  sensor_hash=hashlib.sha256(json.dumps({k:r.get(k) for k in ['t','ax','ay','az','gx','gy','gz','grx','gry','grz','qx','qy','qz','qw']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
  unique[h]=dict(sha256=h,recordingID=m.get('recordingID'),sessionID=m.get('sessionID'),copies=[str(file)],samples=len(times),start=m.get('startedAt'),version=m.get('version'),wrist=m.get('chosenWrist',m.get('wrist')),physicalTotal=m.get('trueStitches'),origin=origin,first=times[0] if times else None,last=times[-1] if times else None,hasStop=any(e.get('kind')=='stop' for e in r.get('counterEvents',[])))
  unique[h]['sensorSHA256']=sensor_hash
 except Exception as e:errors.append(dict(file=str(file),error=str(e)))
sessions=collections.defaultdict(list);ids=collections.defaultdict(list)
for h,r in unique.items():
 sessions[r['sessionID'] or h].append(h)
 if r['recordingID']:ids[r['recordingID']].append(h)
joins=[]
for sid,hashes in sessions.items():
 parts=sorted((unique[h] for h in hashes),key=lambda r:r['origin'] if r['origin'] is not None else -1)
 for before,after in zip(parts,parts[1:]):
  gap=None if any(x is None for x in [before['origin'],after['origin'],before['last'],after['first']]) else after['origin']+after['first']-before['origin']-before['last']
  joins.append(dict(sessionID=sid,before=before['sha256'],after=after['sha256'],gapSeconds=gap,joinable=gap is not None and 0<gap<=.5))
sensor_groups=collections.defaultdict(list)
for h,r in unique.items():sensor_groups[r['sensorSHA256']].append(h)
result=dict(recordings=list(unique.values()),sessions=dict(sessions),sensorEquivalentExports=dict(sensor_groups),distinctSensorStreams=len(sensor_groups),partBoundaries=joins,conflictingIDs={k:v for k,v in ids.items() if len(v)>1},errors=errors)
a.output.write_text(json.dumps(result,indent=2)+'\n');print(len(unique),'unique exports;',len(sessions),'session identities;',len(errors),'unreadable files;',len(result['conflictingIDs']),'IDs with distinct contents')
