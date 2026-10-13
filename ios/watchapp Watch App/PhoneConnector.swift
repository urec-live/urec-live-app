import WatchConnectivity
import Combine

class PhoneConnector: NSObject, WCSessionDelegate, ObservableObject {
    @Published var currentExercise: String = "No Active Workout"
    @Published var isWorkoutActive: Bool = false
    @Published var isResting: Bool = false
    @Published var exerciseStartTime: Double = 0
    @Published var restStartTime: Double = 0
    @Published var displayExerciseTime: Int = 0
    @Published var displayRestTime: Int = 0
    
    // For logging sets
    @Published var reps: Int = 10
    @Published var weight: Double = 45.0
    
    private var mainTimer: Timer?
    static let shared = PhoneConnector()

    override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        processIncoming(message)
        replyHandler(["status": "success"])
    }

    private func processIncoming(_ data: [String: Any]) {
        DispatchQueue.main.async {
            guard let status = (data["status"] as? String)?.uppercased() else { return }
            self.exerciseStartTime = data["exerciseStartTime"] as? Double ?? self.exerciseStartTime
            self.restStartTime = data["restStartTime"] as? Double ?? 0
            self.currentExercise = data["exercise"] as? String ?? self.currentExercise
            
            switch status {
            case "START":
                self.isWorkoutActive = true
                self.isResting = false
                if self.mainTimer == nil { self.startGlobalTimer() }
            case "PAUSE":
                self.isWorkoutActive = true
                self.isResting = true
            case "END":
                self.isWorkoutActive = false
                self.stopGlobalTimer()
            default: break
            }
        }
    }

    private func startGlobalTimer() {
        mainTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            DispatchQueue.main.async {
                let now = Date().timeIntervalSince1970 * 1000
                if self.isWorkoutActive {
                    self.displayExerciseTime = Int((now - self.exerciseStartTime) / 1000)
                    self.displayRestTime = self.isResting && self.restStartTime > 0 ? Int((now - self.restStartTime) / 1000) : 0
                }
            }
        }
    }

    func stopGlobalTimer() {
        mainTimer?.invalidate()
        mainTimer = nil
    }

    func toggleRest() {
        let now = Date().timeIntervalSince1970 * 1000
        let newStatus = isResting ? "START" : "PAUSE"
        let payload: [String: Any] = [
            "status": newStatus,
            "timestamp": now,
            "exerciseStartTime": exerciseStartTime,
            "restStartTime": isResting ? 0 : now,
            "exercise": currentExercise
        ]
        WCSession.default.sendMessage(payload, replyHandler: nil)
        self.processIncoming(payload)
    }

    func endWorkoutRemotely() {
        let payload: [String: Any] = [
            "status": "END",
            "timestamp": Date().timeIntervalSince1970 * 1000
        ]
        WCSession.default.sendMessage(payload, replyHandler: nil)
        self.processIncoming(payload)
    }

    func logSetToPhone() {
        let payload: [String: Any] = [
            "type": "LOG_SET",
            "reps": reps,
            "weight": weight,
            "exercise": currentExercise
        ]
        WCSession.default.sendMessage(payload, replyHandler: nil)
    }
}