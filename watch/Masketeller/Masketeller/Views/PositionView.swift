import SwiftUI

/// Velg hvor i oppskriften du er: runde og hvilken maske du skal hekle nå.
struct PositionView: View {
    @Environment(CounterModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var round = 1
    @State private var stitch = 1.0
    @State private var initialised = false

    private var roundInfo: Pattern.Round? { model.pattern?.round(num: round) }
    private var rounds: [Int] { model.pattern?.rounds.map(\.num) ?? [] }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Stepper(value: $round, in: (rounds.first ?? 1)...(rounds.last ?? 1)) {
                    VStack(alignment: .leading) {
                        Text("Runde \(round)")
                        if let r = roundInfo {
                            Text("\(r.count) masker" + (r.chartRow.map { " · diagramrad \($0)" } ?? ""))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .onChange(of: round) { _, _ in
                    stitch = min(stitch, Double(roundInfo?.count ?? 1))
                }

                Text("Neste maske")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Text("\(Int(stitch.rounded()))")
                    .font(.system(size: 44, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .focusable()
                    .digitalCrownRotation($stitch, from: 1, through: Double(max(1, roundInfo?.count ?? 1)), by: 1,
                                          sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)

                if let r = roundInfo, let run = r.runInfo(at: Int(stitch.rounded()) - 1) {
                    HStack(spacing: 6) {
                        Circle().fill(Yarn.color(run.run.color))
                            .overlay(Circle().strokeBorder(.secondary.opacity(0.5), lineWidth: 1))
                            .frame(width: 12, height: 12)
                        Text("\(run.run.count) \(Yarn.plural(run.run.color)) \(run.start)–\(run.end) · \(run.position) av \(run.run.count)")
                            .font(.caption2)
                            .lineLimit(2)
                    }
                }

                Button {
                    model.setPosition(round: round, nextStitch: Int(stitch.rounded()))
                    dismiss()
                } label: {
                    Text("Sett")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(roundInfo == nil)
            }
            .padding(.horizontal, 8)
        }
        .navigationTitle("Posisjon")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            guard !initialised else { return }
            initialised = true
            round = model.currentRound?.num ?? (rounds.first ?? 1)
            stitch = Double(model.nextStitchIndex + 1)
        }
    }
}

#Preview {
    NavigationStack { PositionView() }
        .environment(CounterModel())
}
