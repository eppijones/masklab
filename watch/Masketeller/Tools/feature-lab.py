#!/usr/bin/env python3
"""Exploratory session-held-out proxies, NOT stitch-completion classifiers.
Requires numpy. Supply a recording directory and recovered 118-session file.
Only independently supplied totals are scored; wrists are not pooled.
"""
import argparse,csv,json,pathlib
import numpy as np
p=argparse.ArgumentParser();p.add_argument('historical',type=pathlib.Path);p.add_argument('new',type=pathlib.Path);p.add_argument('out',type=pathlib.Path);a=p.parse_args();a.out.mkdir(exist_ok=True,parents=True)
paths=sorted(a.historical.glob('rec-*.json'))+[a.new];sessions=[]
for path in paths:
 r=json.loads(path.read_text());t=np.array(r['t']);g=np.array([r[k] for k in ['gx','gy','gz']]).T
 if len(t)<10:continue
 acc=np.array([r[k] for k in ['ax','ay','az']]).T;gravity=np.array([r.get(k,[]) for k in ['grx','gry','grz']]).T
 magnitude=np.linalg.norm(g,axis=1);dt=np.diff(t,prepend=t[0]);dt=np.clip(dt,0,.1)
 covariance=np.cov(g,rowvar=False);eigenvalues,eigenvectors=np.linalg.eigh(covariance);axis=eigenvectors[:,-1];principal=g@axis
 # Smoothing and signed hysteresis require both motion phases. Amplitude is
 # a per-recording unsupervised percentile: retrospective, not causal watch code.
 smooth=np.convolve(principal,np.ones(5)/5,mode='same');threshold=max(.25,float(np.percentile(np.abs(smooth),65)))
 phase=0;last=-1e9;cycles=[]
 for tm,v in zip(t,smooth):
  if v < -threshold:phase=1
  elif phase and v>threshold and tm-last>.8:cycles.append(float(tm));last=tm;phase=0
 vertical=np.sum(g*gravity,axis=1) if gravity.shape==g.shape else np.zeros(len(t))
 signal=magnitude-np.mean(magnitude);freq=np.fft.rfftfreq(len(signal),np.median(np.diff(t)));power=np.abs(np.fft.rfft(signal))**2;band=(freq>=.05)&(freq<=2);peak=float(freq[band][np.argmax(power[band])])
 hard=118 if path==a.new else 74 if '20260905-121843' in path.name else None
 sessions.append(dict(file=path.name,hardRightWristTruth=hard,gyroIntegral=float(np.sum(magnitude*dt)),accelerationIntegral=float(np.sum(np.linalg.norm(acc,axis=1)*dt)),signedPhaseCycles=len(cycles),principalAxis=axis.tolist(),principalVarianceFraction=float(eigenvalues[-1]/sum(eigenvalues)),verticalEnergyFraction=float(np.sum(vertical**2)/np.sum(magnitude**2)),magnitudeDominantFrequencyHz=peak,phaseThreshold=threshold,phaseTimes=cycles))
validation=[]
for metric in ['gyroIntegral','accelerationIntegral','signedPhaseCycles']:
 hard=[s for s in sessions if s['hardRightWristTruth'] is not None]
 for held in hard:
  train=[s for s in hard if s is not held];ratio=sum(s[metric] for s in train)/sum(s['hardRightWristTruth'] for s in train)
  prediction=held[metric]/ratio
  validation.append(dict(feature=metric,heldOut=held['file'],trainingFiles=[s['file'] for s in train],unitsPerStitch=ratio,prediction=prediction,truth=held['hardRightWristTruth'],error=prediction-held['hardRightWristTruth']))
(a.out/'feature-experiments.json').write_text(json.dumps(dict(sessions=sessions,leaveOneSessionOut=validation,limitations=['Only two independently labeled right-wrist sessions: insufficient production validation.','Principal-axis hysteresis uses future data to select the axis; research-only upper-bound proxy.','Session totals cannot establish phase completion, individual latency, or false positives.']),indent=2))
for row in validation:print(row['feature'],row['heldOut'],round(row['prediction'],1),'truth',row['truth'])
