import SwiftUI

@main
struct MasketellerApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = CounterModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task {
                    #if DEBUG
                    if CommandLine.arguments.contains("--confirmed-r30-s55") {
                        await model.sync.useConfirmedPosition(SharedPosition(patternId: "ro-ro-ro", round: 30, completed: 55))
                    }
                    let args = CommandLine.arguments
                    if let index = args.firstIndex(of: "--confirmed-round"), index + 1 < args.count,
                       let round = Int(args[index + 1]), model.pattern?.round(num: round) != nil {
                        // Explicit maintenance launch only; never a startup migration.
                        await model.sync.useConfirmedPosition(SharedPosition(patternId: "ro-ro-ro", round: round, completed: 0))
                    }
                    #endif
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await model.sync.tick() } }
                }
                .transformEnvironment(\.dynamicTypeSize) { size in
                    #if DEBUG
                    if CommandLine.arguments.contains("--largest-text") { size = .xxxLarge }
                    #endif
                }
        }
    }
}
