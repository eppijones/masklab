import Foundation
@main struct SyncTests {
 @MainActor static func main() async throws {
  let url=URL(string:"http://127.0.0.1:5179/api/sync")!
  func request(_ body:[String:Any], token:String?=nil) async throws -> [String:Any] {
   var r=URLRequest(url:url);r.httpMethod="POST";r.setValue("application/json",forHTTPHeaderField:"Content-Type")
   if let token {r.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")}
   r.httpBody=try JSONSerialization.data(withJSONObject:body)
   let (data,_)=try await URLSession.shared.data(for:r)
   return try JSONSerialization.jsonObject(with:data) as! [String:Any]
  }
  let position:[String:Any] = ["patternId":"ro-ro-ro","round":29,"completed":40]
  let created=try await request(["action":"create","position":position]); let token=created["token"] as! String
  let name="masklab-sync-test-"+UUID().uuidString;let defaults=UserDefaults(suiteName:name)!
  let client=WatchSync(service:name,defaults:defaults,endpoint:url)
  var seen:SharedPosition?
  client.onRemote={seen=$0}
  await client.join(code:created["code"] as! String)
  precondition(client.linked && client.conflict == nil)
  precondition(seen?.round==29 && seen?.completed==40)
  client.local(SharedPosition(patternId:"ro-ro-ro",round:29,completed:44));await client.tick()
  let get=try await request(["action":"get"],token:token)
  let state=get["state"] as! [String:Any]
  precondition((state["position"] as! [String:Any])["completed"] as! Int==44)
  _ = try await request(["action":"set","source":"web","operationId":UUID().uuidString,"revision":state["revision"]!,"position":["patternId":"ro-ro-ro","round":29,"completed":20]],token:token)
  client.local(SharedPosition(patternId:"ro-ro-ro",round:29,completed:43))
  await client.tick();precondition(client.conflict?.position.completed==20)
  client.resolve(useWatch:false,position:SharedPosition(patternId:"ro-ro-ro",round:29,completed:43));precondition(seen?.completed==20)
  client.local(SharedPosition(patternId:"ro-ro-ro",round:29,completed:19))
  let restarted=WatchSync(service:name,defaults:defaults,endpoint:url)
  await restarted.tick()
  let final=try await request(["action":"get"],token:token)
  precondition(((final["state"] as! [String:Any])["position"] as! [String:Any])["completed"] as! Int==19)
  let flakyName=name+"-flaky";let flakyDefaults=UserDefaults(suiteName:flakyName)!
  let another=try await request(["action":"create","position":position])
  let flaky=WatchSync(service:flakyName,defaults:flakyDefaults,endpoint:URL(string:"http://127.0.0.1:5179/api/sync-flaky")!)
  await flaky.join(code:another["code"] as! String)
  flaky.local(SharedPosition(patternId:"ro-ro-ro",round:29,completed:41));await flaky.tick()
  // Server committed 41 but the response was lost. A newer edit must not replace its retry ID.
  flaky.local(SharedPosition(patternId:"ro-ro-ro",round:29,completed:42))
  for _ in 0..<20 { await flaky.tick();try await Task.sleep(for:.milliseconds(30)) }
  let recovered=try await request(["action":"get"],token:another["token"] as? String)
  precondition(flaky.conflict == nil)
  precondition(((recovered["state"] as! [String:Any])["position"] as! [String:Any])["completed"] as! Int==42)
  print("PASS lost acknowledgement followed by newer edit: retry recovered without false conflict")
  flaky.disconnect();flakyDefaults.removePersistentDomain(forName:flakyName)
  restarted.disconnect();defaults.removePersistentDomain(forName:name)
  print("PASS production WatchSync: pairing adopts website without blocked state, watch→web 44, conflict, web→watch 20, persisted pending/restart→19")
 }
}
