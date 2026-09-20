import sys,json
sys.path.insert(0,'/tmp/masklab-test-deps')
from redislite import Redis
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
redis=Redis('/tmp/masklab-sync-test.rdb')
class Handler(BaseHTTPRequestHandler):
 def do_POST(self):
  command=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  try:
   value=redis.execute_command(*command)
   def decode(v):
    if isinstance(v,bytes):return v.decode()
    if isinstance(v,list):return [decode(x) for x in v]
    return v
   result={'result':decode(value)}
  except Exception as e:result={'error':str(e)}
  out=json.dumps(result).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(out)
 def log_message(self,*args):pass
print('Local Redis REST on 127.0.0.1:8079',flush=True)
ThreadingHTTPServer(('127.0.0.1',8079),Handler).serve_forever()
