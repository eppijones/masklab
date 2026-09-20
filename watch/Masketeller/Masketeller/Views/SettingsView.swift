import SwiftUI

struct SettingsView: View {
    @Environment(CounterModel.self) private var model

    var body: some View {
        @Bindable var model = model

        List {
            Section("Nettsiden") { NavigationLink("Koble til nettsiden") { SyncView() }
                Text(model.sync.status).font(.caption2)
            }
            Section("Neste opptak") {
                Picker("Garn", selection: $model.settings.yarnCondition) {
                    ForEach(YarnCondition.allCases, id: \.self) { Text($0.label).tag($0) }
                }.disabled(model.isTracking || model.isRecording)
                Text("Skyggemåling: samler data. Ingen ny detektor styrer telleren.").font(.caption2)
            }
            Section {
                LabeledContent("Fysisk håndledd", value: "Høyre")
                LabeledContent("Aktiv profil", value: "\(model.wrist.label) · k \(String(format: "%.2f", model.cyclesPerStitch))")
                LabeledContent("Algoritme", value: AppIdentity.algorithmVersion)
                NavigationLink {
                    LearnRowView()
                } label: {
                    VStack(alignment: .leading) {
                        Text("Lær av raden")
                        Text("Rett tallet og finjuster forholdet")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Text(model.learning.reason).font(.caption2)
                Button("Angre modelloppdatering", action: model.rollbackLearning).disabled(model.isTracking)
                Button("Nullstill læring", action: model.resetLearning).disabled(model.isTracking)

            } header: {
                Text("Gjenkjenning")
            } footer: {
                Text(recognitionFooter)
            }

            Section {
                Picker("Oppskrift", selection: $model.settings.patternId) {
                    Text("Ingen").tag(String?.none)
                    ForEach(Pattern.available, id: \.id) { p in
                        Text(p.title).tag(String?.some(p.id))
                    }
                }
                if model.pattern != nil {
                    NavigationLink {
                        PositionView()
                    } label: {
                        VStack(alignment: .leading) {
                            Text("Gå til runde og maske")
                            Text(model.currentRound.map { "Runde \($0.num) · neste maske \(model.nextStitchIndex + 1)" } ?? "Runde \(model.rows)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Toggle("Vibrer ved fargebytte", isOn: $model.settings.hapticColorChange)
                }
            } header: {
                Text("Oppskrift")
            } footer: {
                if model.pattern != nil {
                    Text("Runden fullføres automatisk ved riktig antall masker, og telleren viser hvilken farge neste maske skal ha.")
                }
            }

            Section("Rader") {
                Stepper(value: $model.settings.stitchesPerRow, in: 0...500, step: 1) {
                    VStack(alignment: .leading) {
                        Text("Masker per rad")
                        Text(model.settings.stitchesPerRow == 0 ? "Ikke satt" : "\(model.settings.stitchesPerRow)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Toggle("Ny rad automatisk", isOn: $model.settings.autoNewRow)
                    .disabled(model.settings.stitchesPerRow == 0)
            }
            .disabled(model.pattern != nil)

            Section("Vibrasjon") {
                Toggle("Hver maske", isOn: $model.settings.hapticPerStitch)
                Toggle("Hver tiende", isOn: $model.settings.hapticEveryTen)
            }

            Section {
                Toggle("Ta opp når jeg starter", isOn: $model.settings.autoRecord)
                Toggle("Hold appen våken", isOn: $model.settings.keepAwake)
            } footer: {
                Text(autoRecordFooter + " " + keepAwakeFooter)
            }
        }
        .navigationTitle("Innstillinger")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var recognitionFooter: String {
        return "Fysisk håndledd overstyrer klokkas innstilling. Kronen flytter tallet uten å endre k. Bekreft antall ved starten og slutten av lengre strekk. Læring vurderes først når du stopper, etter minst fire bekreftede økter."
    }

    private var autoRecordFooter: String {
        "Start lagrer bevegelsen automatisk, så neste runder kan brukes til å forbedre tellingen."
    }

    private var keepAwakeFooter: String {
        switch model.workoutState {
        case .running: return "Treningsøkt kjører, så tellingen fortsetter når du senker armen."
        case .denied: return "Gi tilgang til Helse i Innstillinger for å telle med armen nede."
        case .unavailable: return "Helse er ikke tilgjengelig på denne enheten."
        case .failed(let msg): return "Kunne ikke starte treningsøkt: \(msg)"
        case .idle: return "Starter en treningsøkt («annet») så tellingen fortsetter når du senker armen."
        }
    }
}

#Preview {
    NavigationStack { SettingsView() }
        .environment(CounterModel())
}
