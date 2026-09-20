import SwiftUI

/// Hovedsiden: stort masketall, rad, status og start/stopp.
/// Digital Crown justerer tallet manuelt.
struct CounterView: View {
    @Environment(CounterModel.self) private var model
    @State private var crownValue = 0.0
    @State private var crownApplied = 0
    @State private var pulse = false
    @State private var showSync = false

    var body: some View {
        VStack(spacing: 3) {
            if model.sync.conflict != nil {
                Button("Synk: velg posisjon ›") { showSync = true }
                    .font(.system(size: 12)).buttonStyle(.plain)
            } else {
                Button { showSync = true } label: {
                    Text(model.feedback.isEmpty ? (model.sync.linked ? model.sync.status : "Koble til nettsiden ›") : model.feedback)
                }.buttonStyle(.plain)
                    .font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
            }
            HStack(spacing: 6) {
                Button { model.adjust(by: -1) } label: {
                    Text("−1").font(.system(size: 19, weight: .bold)).frame(maxWidth: .infinity, minHeight: 44)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
                }
                .accessibilityLabel("Trekk fra én maske")
                Text("\(model.pattern == nil ? model.stitches : model.stitchesInRow)")
                    .font(.system(size: 32, weight: .semibold, design: .rounded))
                    .monospacedDigit().minimumScaleFactor(0.65).lineLimit(1)
                    .frame(minWidth: 44)
                    .accessibilityLabel("\(model.stitchesInRow) av \(model.rowTarget) ferdige masker")
                Button { model.adjust(by: 1) } label: {
                    Text("+1").font(.system(size: 19, weight: .bold)).frame(maxWidth: .infinity, minHeight: 44)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
                }
                .accessibilityLabel("Legg til én maske")
            }
            .buttonStyle(.plain)

            if model.pattern != nil { patternStrip }
            HStack(spacing: 6) {
                Button(action: model.undo) { Text("Angre").frame(maxWidth: .infinity, minHeight: 24) }.disabled(!model.canUndo)
                Button(action: model.confirmCount) { Text("Bekreft").frame(maxWidth: .infinity, minHeight: 24) }
            }
            .font(.system(size: 12)).buttonStyle(.plain)
            Button(action: model.toggleTracking) {
                Label(model.isTracking ? "Pause" : "Start", systemImage: model.isTracking ? "pause.fill" : "play.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(model.isTracking ? Color.orange : Color.accentColor, in: Capsule())
            }
            .tint(model.isTracking ? .orange : .accentColor)
            .buttonStyle(.plain)
        }
        .dynamicTypeSize(.small ... .xxxLarge)
        .padding(.bottom, 2)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showSync) { NavigationStack { SyncView() } }
        .navigationTitle("Masketeller")
        .navigationBarTitleDisplayMode(.inline)
        .focusable()
        .digitalCrownRotation($crownValue, from: -10_000, through: 10_000, by: 1,
                              sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
        .onChange(of: crownValue) { _, newValue in
            let steps = Int(newValue.rounded())
            let delta = steps - crownApplied
            guard delta != 0 else { return }
            crownApplied = steps
            model.adjust(by: delta)
        }
        .onChange(of: model.stitches) { old, new in
            guard new > old, model.isTracking else { return }
            withAnimation(.easeOut(duration: 0.12)) { pulse = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) {
                withAnimation(.easeIn(duration: 0.15)) { pulse = false }
            }
        }
    }

    private var header: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
            Text(statusText)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Spacer()
            if model.isRecording {
                HStack(spacing: 3) {
                    Circle().fill(.red).frame(width: 6, height: 6)
                    if let started = model.recordingStarted {
                        Text(started, style: .timer)
                            .monospacedDigit()
                    }
                }
                .font(.caption2)
                .foregroundStyle(.red)
            } else if model.isTracking {
                Text("\(model.cyclesInRow) sykler")
                    .font(.caption2)
                    .monospacedDigit()
                    .foregroundStyle(.tertiary)
            } else {
                Text("\(model.wrist.label) · b52")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 4)
    }

    private var rowLabel: String {
        let target = model.rowTarget
        if let round = model.currentRound {
            return "av \(round.count) · Runde \(round.num)" + (round.chartRow.map { " · rad \($0)" } ?? "")
        }
        if target > 0 {
            return "Rad \(model.rows) · \(model.stitchesInRow) av \(target)"
        }
        return "Rad \(model.rows) · \(model.stitchesInRow) i raden"
    }

    /// Neste maske i oppskriften: farge, løp og når fargen byttes.
    private var patternStrip: some View {
        HStack(spacing: 6) {
            if let run = model.nextRun {
                Circle()
                    .fill(Yarn.color(run.run.color))
                    .overlay(Circle().strokeBorder(.secondary.opacity(0.5), lineWidth: 1))
                    .frame(width: 12, height: 12)
                VStack(alignment: .leading, spacing: 0) {
                    Text("Neste \(model.nextStitchIndex + 1): \(run.run.count) \(Yarn.plural(run.run.color)) \(run.start)–\(run.end)")
                        .font(.system(size: 12))
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                    Text(changeText(run))
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            } else if let round = model.currentRound, model.stitchesInRow >= round.count {
                Text("Runden er full – ny runde")
                    .font(.caption2)
                    .foregroundStyle(.green)
            } else {
                Text("Ingen runde \(model.rows) i oppskriften")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
    }

    private func changeText(_ run: Pattern.Round.RunInfo) -> String {
        let left = run.end - (model.nextStitchIndex + 1) + 1
        guard let round = model.currentRound else { return "" }
        if let nextColor = round.color(at: run.end) {
            return left == 1 ? "\(run.position) av \(run.run.count) · bytt til \(Yarn.name(nextColor)) etter denne"
                             : "\(run.position) av \(run.run.count) · \(Yarn.name(nextColor)) om \(left)"
        }
        return "\(run.position) av \(run.run.count) · siste løp i runden"
    }

    private var statusColor: Color {
        switch model.status {
        case .idle: return .gray
        case .listening: return .yellow
        case .crocheting: return .green
        case .paused: return .orange
        }
    }

    private var statusText: String {
        switch model.status {
        case .idle: return model.motionAvailable ? "Klar" : "Ingen sensor"
        case .listening: return "Lytter etter bevegelse…"
        case .crocheting: return "Hekler"
        case .paused: return "Pause"
        }
    }

}

/// Liten stolpe som viser hvor mye bevegelse detektoren ser akkurat nå.
struct ActivityMeter: View {
    var level: Double
    var active: Bool

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(.quaternary)
                Capsule()
                    .fill(active ? Color.green : Color.yellow)
                    .frame(width: max(4, geo.size.width * min(1, max(0, level))))
                    .animation(.linear(duration: 0.1), value: level)
            }
        }
    }
}

#Preview {
    NavigationStack {
        CounterView()
    }
    .environment(CounterModel())
}
