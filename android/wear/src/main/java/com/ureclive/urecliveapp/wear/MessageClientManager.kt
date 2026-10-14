package com.ureclive.urecliveapp.wear

import android.content.Context
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class MessageClientManager(private val context: Context) {

    private val messageClient: MessageClient = Wearable.getMessageClient(context)

    suspend fun toggleRest(workoutState: WorkoutState) {
        val now = System.currentTimeMillis()
        val newStatus = if (workoutState.isResting) "START" else "PAUSE"
        val payload = JSONObject().apply {
            put("type", "WORKOUT_STATUS")
            put("status", newStatus)
            put("timestamp", now)
            put("exerciseStartTime", workoutState.exerciseStartTime)
            put("restStartTime", if (workoutState.isResting) 0L else now)
            put("exercise", workoutState.currentExercise)
            put("event", "message")   // required by react-native-wear-connectivity parser
        }
        sendMessage(payload.toString().toByteArray())
    }

    suspend fun endWorkout() {
        val payload = JSONObject().apply {
            put("type", "WORKOUT_STATUS")
            put("status", "END")
            put("timestamp", System.currentTimeMillis())
            put("event", "message")
        }
        sendMessage(payload.toString().toByteArray())
    }

    suspend fun logSet(reps: Int, weight: Double) {
        val payload = JSONObject().apply {
            put("type", "LOG_SET")
            put("reps", reps)
            put("weight", weight)
            put("timestamp", System.currentTimeMillis())
            put("event", "message")
        }
        sendMessage(payload.toString().toByteArray())
    }

    // react-native-wear-connectivity reads messageEvent.path as a JSON string and
    // ignores messageEvent.data. Send the JSON payload as the path, null as data.
    private suspend fun sendMessage(data: ByteArray) {
        return suspendCancellableCoroutine { continuation ->
            Wearable.getNodeClient(context).connectedNodes
                .addOnSuccessListener { nodes ->
                    if (nodes.isEmpty()) {
                        continuation.resumeWithException(Exception("No connected nodes"))
                        return@addOnSuccessListener
                    }
                    val nodeId = nodes.iterator().next().id
                    val jsonPath = String(data)
                    messageClient.sendMessage(nodeId, jsonPath, null)
                        .addOnSuccessListener { continuation.resume(Unit) }
                        .addOnFailureListener { e -> continuation.resumeWithException(e) }
                }
                .addOnFailureListener { e -> continuation.resumeWithException(e) }
        }
    }
}
