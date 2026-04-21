import SwiftUI

struct LogSetView: View {
    @ObservedObject var connector: PhoneConnector
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ScrollView { // ScrollView handles small screen overflows
            VStack(spacing: 8) {
                Text("LOG SET")
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.green)
                    .padding(.top, 5)
                
                Divider().background(Color.green.opacity(0.3))

                // Reps Stepper - Compact Layout
                VStack(spacing: 2) {
                    Text("REPS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.secondary)
                    
                    Stepper(value: $connector.reps, in: 1...100) {
                        Text("\(connector.reps)")
                            .font(.system(size: 20, weight: .bold, design: .monospaced))
                    }
                    .controlSize(.small)
                }
                .padding(.horizontal)

                // Weight Stepper - Compact Layout
                VStack(spacing: 2) {
                    Text("WEIGHT (LBS)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.secondary)
                    
                    Stepper(value: $connector.weight, in: 0...1000, step: 5) {
                        Text("\(Int(connector.weight))")
                            .font(.system(size: 20, weight: .bold, design: .monospaced))
                    }
                    .controlSize(.small)
                }
                .padding(.horizontal)

                Button(action: {
                    connector.logSetToPhone()
                    dismiss()
                }) {
                    Text("CONFIRM")
                        .font(.system(size: 12, weight: .heavy))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .padding(.horizontal)
                .padding(.top, 5)
            }
        }
    }
}