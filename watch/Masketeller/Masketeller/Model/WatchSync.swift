import Foundation
import Observation
import Security

struct SharedPosition: Codable, Equatable {
    var patternId: String
    var round: Int
    var completed: Int
}
struct SharedSnapshot: Codable {
    var position: SharedPosition
    var revision: Int
    var source: String
    var updatedAt: Double
}
struct SyncPending: Codable {
    var position: SharedPosition
    var operationId: String
    var revision: Int
}

/// Opt-in position sync. Counting and recording never depend on network success.
@MainActor @Observable
final class WatchSync {
    private(set) var status = "Ikke koblet til"
    private(set) var conflict: SharedSnapshot?
    private(set) var linked = false
    var onRemote: ((SharedPosition) -> Void)?
    private var token: String?
    private var revision = 0
    private var pending: SyncPending?
    private var inFlight: SyncPending?
    private var busy = false
    private var lastHTTP = 0
    private var lastRTT = 0.0
    private var loop: Task<Void, Never>?
    private let defaults: UserDefaults
    private let service: String
    private let endpoint: URL
    private struct Response: Decodable { var token: String?; var state: SharedSnapshot?; var error: String? }

    init(service: String = "masklab-sync", defaults: UserDefaults = .standard,
         endpoint: URL = URL(string: "https://masklab.vercel.app/api/sync")!) {
        self.service = service; self.defaults = defaults; self.endpoint = endpoint
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecReturnData as String: true]
        var result: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
           let data = result as? Data { token = String(data: data, encoding: .utf8) }
        revision = defaults.integer(forKey: "sync.revision")
        if let data = defaults.data(forKey: "sync.pending") { pending = try? JSONDecoder().decode(SyncPending.self, from: data) }
        if let data = defaults.data(forKey: "sync.inFlight") { inFlight = try? JSONDecoder().decode(SyncPending.self, from: data) }
        linked = token != nil
        if linked { status = "Kobler til…" }
    }
    func start() {
        guard loop == nil else { return }
        loop = Task { [weak self] in
            while !Task.isCancelled {
                await self?.tick()
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }
    private func persist() {
        defaults.set(revision, forKey: "sync.revision")
        if let inFlight { defaults.set(try? JSONEncoder().encode(inFlight), forKey: "sync.inFlight") }
        else { defaults.removeObject(forKey: "sync.inFlight") }
        if let pending { defaults.set(try? JSONEncoder().encode(pending), forKey: "sync.pending") }
        else { defaults.removeObject(forKey: "sync.pending") }
    }
    func local(_ position: SharedPosition) {
        guard linked else { return }
        pending = SyncPending(position: position, operationId: UUID().uuidString, revision: pending?.revision ?? revision)
        status = "Venter på synk"
        persist()
        Task { await tick() }
    }
    func join(code: String) async {
        guard !busy else { return }
        busy = true; defer { busy = false }
        do {
            let (_, response) = try await request(["action": "join", "code": code.uppercased().replacingOccurrences(of: " ", with: "")])
            guard let secret = response.token, let state = response.state else { status = "Koden er utløpt"; return }
            let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
            SecItemDelete(query as CFDictionary)
            var item = query
            item[kSecValueData as String] = Data(secret.utf8)
            item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { status = "Kunne ikke lagre parkobling"; return }
            token = secret; linked = true; revision = state.revision; pending = nil; inFlight = nil
            // Entering the website code explicitly continues the recipe shown there.
            conflict = nil; onRemote?(state.position); status = "Venter på synk"; persist()
        } catch { status = "Kunne ikke koble til" }
    }
    func resolve(useWatch: Bool, position: SharedPosition) {
        guard let conflict else { return }
        revision = conflict.revision
        self.conflict = nil; inFlight = nil
        if useWatch { pending = SyncPending(position: position, operationId: UUID().uuidString, revision: revision) }
        else { pending = nil; onRemote?(conflict.position) }
        status = "Venter på synk"; persist()
        Task { await tick() }
    }
    func useConfirmedPosition(_ position: SharedPosition) async {
        while busy { try? await Task.sleep(for: .milliseconds(50)) }
        guard linked else { onRemote?(position); return }
        busy = true
        do {
            let (code, response) = try await request(["action": "get", "source": "watch"])
            guard code == 200, let state = response.state else { busy = false; return }
            revision = state.revision; conflict = nil; inFlight = nil; pending = nil
            onRemote?(position)
            pending = SyncPending(position: position, operationId: UUID().uuidString, revision: revision)
            persist()
        } catch { status = "Frakoblet – lagret lokalt" }
        busy = false
        await tick()
    }
    func disconnect() {
        token = nil; linked = false; pending = nil; inFlight = nil; conflict = nil
        SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service] as CFDictionary)
        persist(); status = "Ikke koblet til"
    }
    private func request(_ body: [String: Any]) async throws -> (Int, Response) {
        var req = URLRequest(url: endpoint); req.httpMethod = "POST"; req.timeoutInterval = 8
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let started = Date()
        let (data, response) = try await URLSession.shared.data(for: req)
        lastRTT = Date().timeIntervalSince(started) * 1000
        lastHTTP = (response as? HTTPURLResponse)?.statusCode ?? 500
        return ((response as? HTTPURLResponse)?.statusCode ?? 500, try JSONDecoder().decode(Response.self, from: data))
    }
    func tick() async {
        guard linked, !busy else { return }
        busy = true
        var drain = false
        defer {
            busy = false
            persist()
            if service == "masklab-sync" {
                let info: [String: Any] = ["status": status, "revision": revision, "http": lastHTTP,
                    "rttMs": lastRTT, "pending": pending != nil, "inFlight": inFlight != nil,
                    "conflict": conflict != nil, "writtenAt": ISO8601DateFormatter().string(from: Date())]
                let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("sync-status.json")
                if let data = try? JSONSerialization.data(withJSONObject: info) { try? data.write(to: url, options: .atomic) }
            }
            if drain { Task { await tick() } }
        }
        let wasConflicted = conflict != nil
        if !wasConflicted && inFlight == nil { inFlight = pending; persist() }
        let sent = wasConflicted ? nil : inFlight
        let originalToken = token
        do {
            var body: [String: Any] = ["action": "get", "source": "watch", "conflict": wasConflicted]
            if let sent {
                body = ["action": "set", "position": try JSONSerialization.jsonObject(with: JSONEncoder().encode(sent.position)),
                    "operationId": sent.operationId, "revision": sent.revision, "source": "watch"]
            }
            let (code, response) = try await request(body)
            guard token == originalToken else { return }
            guard let state = response.state, code == 200 || code == 409 else { status = response.error ?? "Frakoblet – prøver igjen"; return }
            if wasConflicted { conflict = state; status = "Velg posisjon"; return }
            if code == 409 { conflict = state; status = "Velg posisjon"; return }
            revision = state.revision
            if let sent {
                inFlight = nil
                if pending?.operationId == sent.operationId { pending = nil }
                else { pending?.revision = state.revision }
            }
            if pending == nil { onRemote?(state.position) }
            else if sent == nil && pending?.revision != state.revision { conflict = state }
            status = conflict != nil ? "Velg posisjon" : pending == nil ? "Lagret i synk" : "Venter på synk"
            drain = pending != nil && conflict == nil
            persist()
        } catch { status = "Frakoblet – lagret lokalt" }
    }
}
