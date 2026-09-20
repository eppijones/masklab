import SwiftUI

struct HistoryView: View {
    @Environment(CounterModel.self) private var model

    var body: some View {
        List {
            if model.history.isEmpty {
                ContentUnavailableView("Ingen økter enda",
                                       systemImage: "clock.arrow.circlepath",
                                       description: Text("Avsluttede økter havner her."))
            } else {
                Section {
                    ForEach(model.history) { record in
                        HistoryRow(record: record)
                    }
                    .onDelete { offsets in
                        for index in offsets { model.delete(model.history[index]) }
                    }
                } footer: {
                    Text(totalText)
                }
            }
        }
        .navigationTitle("Historikk")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var totalText: String {
        let total = model.history.reduce(0) { $0 + $1.stitches }
        return "Totalt \(total) masker i \(model.history.count) økter"
    }
}

struct HistoryRow: View {
    let record: SessionRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text("\(record.stitches)")
                    .font(.title3.weight(.semibold).monospacedDigit())
                Text("masker")
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(record.rows) \(record.rows == 1 ? "rad" : "rader")")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            HStack {
                Text(record.started, format: .dateTime.day().month(.abbreviated).hour().minute())
                Spacer()
                Text(durationText)
            }
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 2)
    }

    private var durationText: String {
        let minutes = Int(record.duration / 60)
        if minutes < 60 { return "\(minutes) min" }
        return "\(minutes / 60) t \(minutes % 60) min"
    }
}

#Preview {
    NavigationStack { HistoryView() }
        .environment(CounterModel())
}
