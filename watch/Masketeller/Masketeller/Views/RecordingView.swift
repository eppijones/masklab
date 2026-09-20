import SwiftUI

/// Opptak av rådata fra sensorene, med fasit fra brukeren, til å tune detektoren.
struct RecordingView: View {
    @Environment(CounterModel.self) private var model
    @State private var trueCount = 0
    @State private var crownValue = 0.0
    @State private var knowsCount = true
    @State private var confirmDelete: RecordingStore.Info?

    var body: some View {
        Group {
            if model.isRecording {
                recordingInProgress
            } else if model.pendingRecording != nil {
                enterTrueCount
            } else {
                idle
            }
        }
        .navigationTitle("Opptak")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Pågår

    private var recordingInProgress: some View {
        VStack(spacing: 6) {
            HStack {
                Circle().fill(.red).frame(width: 8, height: 8)
                if let started = model.recordingStarted {
                    Text(started, style: .timer)
                        .monospacedDigit()
                }
                Spacer()
                Text("\(model.recordingDetected) sykler")
                    .foregroundStyle(.secondary)
            }
            .font(.caption2)
            .padding(.horizontal, 4)

            Spacer(minLength: 0)

            Button {
                model.addRecordingMarker()
            } label: {
                VStack(spacing: 2) {
                    Text("Markør")
                        .font(.title3.weight(.semibold))
                    Text("\(model.recordingMarkers) satt")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, minHeight: 64)
            }
            .buttonStyle(.bordered)
            .tint(.yellow)

            Spacer(minLength: 0)

            Button {
                model.stopRecording()
            } label: {
                Label("Stopp opptak", systemImage: "stop.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
        }
        .padding(.bottom, 4)
    }

    // MARK: - Fasit

    private var enterTrueCount: some View {
        ScrollView {
            VStack(spacing: 8) {
                Text("Hvor mange masker heklet du?")
                    .font(.headline)
                    .multilineTextAlignment(.center)

                if knowsCount {
                    Text("\(trueCount)")
                        .font(.system(size: 48, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        .animation(.snappy, value: trueCount)
                        .focusable()
                        .digitalCrownRotation($crownValue, from: 0, through: 2000, by: 1,
                                              sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
                        .onChange(of: crownValue) { _, v in trueCount = Int(v.rounded()) }

                    HStack {
                        Button { bump(-1) } label: { Image(systemName: "minus").frame(maxWidth: .infinity) }
                        Button { bump(-10) } label: { Text("−10").frame(maxWidth: .infinity) }
                        Button { bump(10) } label: { Text("+10").frame(maxWidth: .infinity) }
                        Button { bump(1) } label: { Image(systemName: "plus").frame(maxWidth: .infinity) }
                    }
                    .buttonStyle(.bordered)
                    .font(.caption)

                    Text("Appen anslo \(model.stitches). Bruk kronen eller knappene.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                Toggle("Jeg vet antallet", isOn: $knowsCount)
                    .font(.caption)

                Button {
                    model.saveRecording(trueStitches: knowsCount ? trueCount : nil)
                } label: {
                    Label("Lagre opptak", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)

                Button("Forkast", role: .destructive) {
                    model.discardRecording()
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 2)
        }
        .onAppear {
            trueCount = model.stitches
            crownValue = Double(trueCount)
        }
    }

    private func bump(_ delta: Int) {
        trueCount = max(0, trueCount + delta)
        crownValue = Double(trueCount)
    }

    // MARK: - Hvile

    private var idle: some View {
        List {
            Section {
                Button {
                    model.startRecording()
                } label: {
                    Label("Start opptak", systemImage: "record.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .listRowBackground(Color.clear)
                .disabled(!model.motionAvailable)
            } footer: {
                Text("Start på telleren tar også opp automatisk. Her kan du starte et eget opptak, merke tidspunkter og skrive inn fasit.")
            }

            if let err = model.recordingError {
                Section { Text(err).font(.caption2).foregroundStyle(.red) }
            }

            if !model.recordings.isEmpty {
                Section {
                    ForEach(model.recordings) { info in
                        RecordingRow(info: info)
                            .swipeActions {
                                Button(role: .destructive) { confirmDelete = info } label: {
                                    Label("Slett", systemImage: "trash")
                                }
                            }
                    }
                } header: {
                    Text("Lagrede opptak")
                } footer: {
                    Text("Hentes til Mac med devicectl – se README.")
                }
            }
        }
        .confirmationDialog("Slette opptaket?", isPresented: Binding(get: { confirmDelete != nil }, set: { if !$0 { confirmDelete = nil } }), titleVisibility: .visible) {
            Button("Slett", role: .destructive) {
                if let info = confirmDelete { model.deleteRecording(info) }
                confirmDelete = nil
            }
            Button("Avbryt", role: .cancel) { confirmDelete = nil }
        }
    }
}

struct RecordingRow: View {
    let info: RecordingStore.Info

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(info.startedAt, format: .dateTime.day().month(.abbreviated).hour().minute())
                Spacer()
                Text(durationText)
                    .foregroundStyle(.secondary)
            }
            .font(.caption)
            HStack {
                if let truth = info.trueStitches {
                    Text("Fasit \(truth) · telt \(info.detectedStitches)")
                } else {
                    Text("Telt \(info.detectedStitches)")
                }
                Spacer()
                Text("\(info.markers) mark. · \(info.bytes / 1024) kB")
            }
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
    }

    private var durationText: String {
        let s = Int(info.duration)
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}

#Preview {
    NavigationStack { RecordingView() }
        .environment(CounterModel())
}
