import concurrent.futures,json,subprocess,sys,uuid
url=sys.argv[1]
def request(body,token=None):
 headers='Content-Type: application/json\n'
 if token:headers+='Authorization: Bearer '+token+'\n'
 result=subprocess.run(['vercel','curl','/api/sync','--deployment',url,'--','--silent','--show-error','--request','POST','--header','@-','--data',json.dumps(body),'--write-out','\n%{http_code}'],input=headers,text=True,capture_output=True,check=True)
 raw,status=result.stdout.strip().rsplit('\n',1)
 return int(status),json.loads(raw)
p={'patternId':'ro-ro-ro','round':29,'completed':40}
status,created=request({'action':'create','position':p});assert status==200,(status,created)
token=created['token']
status,joined=request({'action':'join','code':created['code']});assert status==200 and joined['token']==token
operations=[{'action':'set','position':dict(p,completed=n),'revision':0,'operationId':str(uuid.uuid4()),'source':source} for n,source in [(41,'web'),(42,'watch')]]
with concurrent.futures.ThreadPoolExecutor() as pool:results=list(pool.map(lambda op:request(op,token),operations))
assert sorted(x[0] for x in results)==[200,409],[(s,d.get('error')) for s,d in results]
index=0 if results[0][0]==200 else 1
status,retry=request(operations[index],token);assert status==200 and retry['state']['revision']==1
status,back=request({'action':'set','position':dict(p,completed=20),'revision':1,'operationId':str(uuid.uuid4()),'source':'watch'},token);assert status==200 and back['state']['position']['completed']==20
status,read=request({'action':'get'},token);assert status==200 and read['state']['revision']==2
print('PASS deployed API: pairing, two competing writers (one 409), idempotent retry, backward move, persisted read')
