import SwiftUI

/// «Lær av raden»: brukeren oppgir hvor mange masker gjeldende rad faktisk har.
/// Modellen retter tallet og justerer «sykler per maske» for håndleddet.
struct LearnRowView: View {
    @Environment(CounterModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var actual = 0.0
    @State private var initialised = false

    var body: some View {
        VStack(spacing: 8) {
            Text("Masker i raden nå")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Text("\(Int(actual.rounded()))")
                .font(.system(size: 52, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
                .focusable()
                .digitalCrownRotation($actual, from: 0, through: 999, by: 1,
                                      sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)

            Text(detail)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)

            Button {
                model.learnFromRow(actual: Int(actual.rounded()))
                dismiss()
            } label: {
                Text("Bruk")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(Int(actual.rounded()) <= 0)
        }
        .padding(.horizontal, 8)
        .navigationTitle("Lær av raden")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            guard !initialised else { return }
            initialised = true
            actual = Double(model.stitchesInRow)
        }
    }

    private var detail: String {
        let cycles = model.cyclesInRow
        let n = Int(actual.rounded())
        if cycles < 3 || n < 3 {
            return "Appen viser \(model.stitchesInRow). Vri kronen til riktig antall. Forholdet justeres bare når raden har minst 3 masker og 3 sykler."
        }
        let ratio = Double(cycles) / Double(n)
        return String(format: "Appen viser %d. %d sykler ÷ %d masker = %.1f per maske (nå %.1f).",
                      model.stitchesInRow, cycles, n, ratio, model.cyclesPerStitch)
    }
}

#Preview {
    NavigationStack { LearnRowView() }
        .environment(CounterModel())
}
