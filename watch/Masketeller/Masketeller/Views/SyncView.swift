import SwiftUI
struct SyncView: View {
    var onContinue: (() -> Void)? = nil
    @Environment(CounterModel.self) private var model
    @State private var code = ""
    var body: some View {
        List {
            Text(model.sync.status)
            if !model.sync.linked {
                Text("Åpne klokkeikonet på nettsiden. Skriv koden for å fortsette der nettsiden er.").font(.caption2)
                Text(code.isEmpty ? "6-sifret kode" : code)
                    .font(.title3.monospacedDigit())
                    .accessibilityLabel("Kode: \(code)")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 4) {
                    ForEach(1...9, id: \.self) { digit in
                        Button("\(digit)") { if code.count < 6 { code += "\(digit)" } }
                    }
                    Button("Slett") { if !code.isEmpty { code.removeLast() } }
                    Button("0") { if code.count < 6 { code += "0" } }
                    Button("Tøm") { code = "" }
                }.buttonStyle(.bordered)
                Button("Fortsett fra nettsiden") { Task { await model.sync.join(code: code) } }.disabled(code.count != 6)
            }
            if let other = model.sync.conflict {
                Text("Nettsiden: runde \(other.position.round), \(other.position.completed) ferdige")
                Button("Bruk nettsiden") { model.sync.resolve(useWatch: false, position: model.sharedPosition) }
                Button("Bruk klokka") { model.sync.resolve(useWatch: true, position: model.sharedPosition) }
            }
            if model.sync.linked {
                if let onContinue {
                    Button("Fortsett til telleren", action: onContinue)
                        .disabled(model.sync.conflict != nil)
                }
                Button("Koble fra", action: model.sync.disconnect)
            }
            Text("Posisjon deles når nettet er tilgjengelig. Råopptak blir på klokka.").font(.caption2)
        }.navigationTitle("Synk med nettsiden")
    }
}
