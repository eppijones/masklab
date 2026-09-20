#!/usr/bin/env python3
"""One-to-one event scoring ONLY inside exhaustively annotated, aligned intervals."""
import argparse,json,math,pathlib,statistics

def score(labels,predictions,partition='holdout'):
 intervals=[r for r in labels.get('scorableIntervals',[]) if r['partition']==partition]
 def eligible(t):return any(a['start']<=t<a['end'] for a in intervals) and not any(a['start']<=t<a['end'] for a in labels.get('uncertainIntervals',[]))
 truth=sorted(e['time'] for e in labels.get('completions',[]) if e.get('confidence')=='clear' and eligible(e['time']))
 pred=sorted(t for t in predictions if math.isfinite(t) and eligible(t))
 if not intervals or not truth:return dict(eligible=False,reason='No exhaustively labeled completion interval; accuracy unverified',precision=None,recall=None,f1=None,intervals=len(intervals),clearCompletions=len(truth),suppliedPredictions=len(predictions),scorablePredictions=len(pred))
 # Chronological DP: maximize matches, then minimize absolute latency. No double matches.
 tolerance=labels.get('matchingToleranceSeconds',1.0);dp=[[None]*(len(pred)+1) for _ in range(len(truth)+1)];dp[0][0]=(0,0,[])
 def offer(i,j,x):
  old=dp[i][j]
  if old is None or (x[0],-x[1])>(old[0],-old[1]):dp[i][j]=x
 for i in range(len(truth)+1):
  for j in range(len(pred)+1):
   x=dp[i][j]
   if x is None:continue
   if i<len(truth):offer(i+1,j,x)
   if j<len(pred):offer(i,j+1,x)
   if i<len(truth) and j<len(pred) and abs(pred[j]-truth[i])<=tolerance:
    offer(i+1,j+1,(x[0]+1,x[1]+abs(pred[j]-truth[i]),x[2]+[(i,j)]))
 matches=dp[-1][-1][2];used={j for i,j in matches};latency=[pred[j]-truth[i] for i,j in matches];tp=len(matches);fp=len(pred)-tp;fn=len(truth)-tp
 precision=tp/len(pred) if pred else 0;recall=tp/len(truth)
 duplicates=sum(any(abs(t-x)<=tolerance for x in truth) for j,t in enumerate(pred) if j not in used)
 noncrochet=sum(any(a['start']<=t<a['end'] for a in labels.get('nonCrochetIntervals',[])) for t in pred)
 return dict(eligible=True,truePositive=tp,falsePositive=fp,falseNegative=fn,duplicates=duplicates,nonCrochetFalseCounts=noncrochet,precision=precision,recall=recall,f1=2*precision*recall/(precision+recall) if precision+recall else 0,medianSignedLatencySeconds=statistics.median(latency) if latency else None,p95AbsoluteLatencySeconds=sorted(map(abs,latency))[max(0,math.ceil(.95*len(latency))-1)] if latency else None,alignmentUncertaintySeconds=labels.get('alignment',{}).get('uncertaintySeconds'))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('labels',type=pathlib.Path);p.add_argument('predictions',type=pathlib.Path);p.add_argument('--partition',default='holdout');a=p.parse_args();print(json.dumps(score(json.loads(a.labels.read_text()),json.loads(a.predictions.read_text()),a.partition),indent=2))
