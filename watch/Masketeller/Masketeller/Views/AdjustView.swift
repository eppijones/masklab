import SwiftUI

/// Manuelle korreksjoner: ±1, ny rad, angre, avslutt økt.
struct AdjustView: View {
    @Environment(CounterModel.self) private var model
    @State private var confirmFinish = false
    @State private var confirmReset = false

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Button {
                        model.removeStitch()
                    } label: {
                        Image(systemName: "minus")
                            .font(.title2.weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .disabled(model.stitches == 0)

                    Button {
                        model.addStitch()
                    } label: {
                        Image(systemName: "plus")
                            .font(.title2.weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                }
                .buttonStyle(.bordered)

                Button {
                    model.newRow()
                } label: {
                    Label(model.pattern == nil ? "Ny rad" : "Ny runde", systemImage: "arrow.turn.down.left")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)

                Button {
                    model.undo()
                } label: {
                    Label("Angre", systemImage: "arrow.uturn.backward")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(!model.canUndo)

                Divider().padding(.vertical, 2)

                Button {
                    confirmFinish = true
                } label: {
                    Label("Avslutt økt", systemImage: "checkmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.green)
                .disabled(model.stitches == 0 && !model.isTracking)

                Button(role: .destructive) {
                    confirmReset = true
                } label: {
                    Label("Nullstill", systemImage: "arrow.counterclockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(model.stitches == 0)
            }
            .padding(.horizontal, 2)
        }
        .navigationTitle("Juster")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Lagre \(model.stitches) masker i historikken? Oppskriftsposisjonen beholdes.",
                            isPresented: $confirmFinish, titleVisibility: .visible) {
            Button("Avslutt og lagre") { model.finishSession() }
            Button("Avbryt", role: .cancel) {}
        }
        .confirmationDialog("Nullstille telleren uten å lagre?",
                            isPresented: $confirmReset, titleVisibility: .visible) {
            Button("Nullstill", role: .destructive) { model.resetCounts() }
            Button("Avbryt", role: .cancel) {}
        }
    }
}

#Preview {
    NavigationStack { AdjustView() }
        .environment(CounterModel())
}
