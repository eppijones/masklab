#!/usr/bin/env python3
"""Offline release gate. This tool never changes Watch configuration."""
import argparse, json

def qualify(baseline, candidate, history):
    reasons=[]
    if not baseline.get('eligible') or not candidate.get('eligible'):
        reasons.append('Missing exhaustive held-out completion labels')
    elif any(not isinstance(x.get(k),(int,float)) for x in (baseline,candidate) for k in ('precision','recall','f1')):
        reasons.append('Missing event metrics')
    else:
        if candidate['f1'] <= baseline['f1']: reasons.append('Held-out F1 did not improve')
        if candidate['precision'] < baseline['precision']: reasons.append('Held-out precision regressed')
        if candidate['recall'] < baseline['recall']: reasons.append('Held-out recall regressed')
    if not history: reasons.append('Missing independently counted historical sessions')
    for row in history:
        if not row.get('independent'): reasons.append('Historical truth not independently established: '+row['session']); continue
        if abs(row['candidate']-row['truth']) > abs(row['baseline']-row['truth'])+1:
            reasons.append('Historical error worsened by more than one: '+row['session'])
    return {'qualifiesForShadow':not reasons,'selectedMode':'qualified-shadow' if not reasons else 'instrumentation-only','reasons':reasons,'automaticPromotion':False,'visibleCounterPromotion':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('evaluation');a=p.parse_args()
    d=json.load(open(a.evaluation));print(json.dumps(qualify(d['baseline'],d['candidate'],d['history']),indent=2))
