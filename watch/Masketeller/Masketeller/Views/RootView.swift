import SwiftUI

struct RootView: View {
    @Environment(CounterModel.self) private var model
    @State private var page: Page = .counter
    @State private var enteredCounter = false
    @State private var showConnection = false

    enum Page: Hashable { case counter, adjust, recording, settings, history }

    var body: some View {
        NavigationStack {
            if !enteredCounter {
                VStack(spacing: 12) {
                    Text("Masketeller").font(.headline)
                    Text(model.sync.status).font(.caption2).foregroundStyle(.secondary)
                    Button("Koble til nettsiden") { showConnection = true }
                        .buttonStyle(.borderedProminent)
                    Button("Fortsett uten nettsiden") { enteredCounter = true }
                        .buttonStyle(.bordered)
                    Text("Telling og opptak virker også uten nett.")
                        .font(.caption2).foregroundStyle(.secondary)
                }.padding()
            } else {
            TabView(selection: $page) {
                CounterView()
                    .tag(Page.counter)
                AdjustView()
                    .tag(Page.adjust)
                RecordingView()
                    .tag(Page.recording)
                SettingsView()
                    .tag(Page.settings)
                HistoryView()
                    .tag(Page.history)
            }
            .tabViewStyle(.verticalPage)
            }
        }
        .sheet(isPresented: $showConnection) {
            NavigationStack {
                SyncView(onContinue: {
                    showConnection = false
                    enteredCounter = true
                })
            }
        }
    }
}

#Preview {
    RootView()
        .environment(CounterModel())
}
