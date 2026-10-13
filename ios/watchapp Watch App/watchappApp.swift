import SwiftUI

@main
struct watchappApp: App {
    // Use StateObject to ensure the connector stays alive
    @StateObject private var connector = PhoneConnector.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connector) // This makes it accessible everywhere
        }
    }
}

