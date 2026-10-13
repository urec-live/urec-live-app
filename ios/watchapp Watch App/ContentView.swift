import SwiftUI

struct ContentView: View {
    @StateObject private var connector = PhoneConnector.shared
    @State private var showingLogSheet = false

    var body: some View {
        VStack(spacing: 5) {
            if connector.isWorkoutActive {
                // Header
                Text(connector.currentExercise)
                    .font(.caption)
                    .foregroundColor(.green)
                    .bold()
                
                // Main Timer
                Text(formatTime(connector.displayExerciseTime))
                    .font(.system(size: 40, weight: .bold, design: .monospaced))
                
                // Rest Timer
                if connector.isResting {
                    Text("REST: \(formatTime(connector.displayRestTime))")
                        .font(.caption)
                        .foregroundColor(.yellow)
                        .bold()
                } else {
                    // Spacer to keep UI consistent when not resting
                    Text(" ")
                        .font(.caption)
                }

                // Restored Button Row
                HStack(spacing: 12) {
                    Button(action: { connector.toggleRest() }) {
                        Text(connector.isResting ? "Resume" : "Rest")
                    }
                    .tint(.orange)

                    Button(action: { showingLogSheet = true }) {
                        Image(systemName: "plus.circle.fill")
                    }
                    .tint(.blue)

                    Button(role: .destructive, action: { connector.endWorkoutRemotely() }) {
                        Text("End")
                    }
                }
                .controlSize(.small)
            } else {
                VStack {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.largeTitle)
                    Text("Waiting for iPhone...")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .sheet(isPresented: $showingLogSheet) {
            LogSetView(connector: connector)
        }
    }

    func formatTime(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%02d:%02d", m, s)
    }
}