package com.ureclive.urecliveapp.wear

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.Timer
import java.util.TimerTask

data class WorkoutState(
    val currentExercise: String = "",
    val isWorkoutActive: Boolean = false,
    val isResting: Boolean = false,
    val exerciseStartTime: Long = 0L,
    val restStartTime: Long = 0L,
    val displayExerciseSeconds: Int = 0,
    val displayRestSeconds: Int = 0,
    val showLogSetUI: Boolean = false,
    val lastLoggedSetAt: Long = 0L,
)

private val Context.wearDataStore by preferencesDataStore("wear_prefs")

// Singleton — shared by WearViewModel and WearMessageListenerService so that
// phone messages received in the background service update the same state that
// the UI is observing.
object WearRepository {

    private val KEY_EXERCISE = stringPreferencesKey("current_exercise")
    private val KEY_ACTIVE = booleanPreferencesKey("is_workout_active")
    private val KEY_RESTING = booleanPreferencesKey("is_resting")
    private val KEY_EXERCISE_START = longPreferencesKey("exercise_start_time")
    private val KEY_REST_START = longPreferencesKey("rest_start_time")

    private val _workoutState = MutableStateFlow(WorkoutState())
    val workoutState: StateFlow<WorkoutState> = _workoutState.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var displayTimer: Timer? = null
    private var initialized = false

    @Synchronized
    fun initialize(context: Context) {
        if (initialized) return
        initialized = true
        scope.launch { loadFromDataStore(context.applicationContext) }
    }

    private suspend fun loadFromDataStore(context: Context) {
        context.wearDataStore.data.first { prefs ->
            val isActive = prefs[KEY_ACTIVE] ?: false
            _workoutState.value = WorkoutState(
                currentExercise = prefs[KEY_EXERCISE] ?: "",
                isWorkoutActive = isActive,
                isResting = prefs[KEY_RESTING] ?: false,
                exerciseStartTime = prefs[KEY_EXERCISE_START] ?: 0L,
                restStartTime = prefs[KEY_REST_START] ?: 0L,
            )
            if (isActive) startDisplayTimer()
            true
        }
    }

    suspend fun updateFromPhone(context: Context, data: Map<String, Any>) {
        val status = (data["status"] as? String)?.uppercase() ?: return
        val exercise = data["exercise"] as? String ?: _workoutState.value.currentExercise
        val exerciseStartTime = (data["exerciseStartTime"] as? Number)?.toLong()
            ?: _workoutState.value.exerciseStartTime

        val now = System.currentTimeMillis()
        val newState = when (status) {
            "START" -> _workoutState.value.copy(
                currentExercise = exercise,
                isWorkoutActive = true,
                isResting = false,
                exerciseStartTime = exerciseStartTime,
                restStartTime = 0L,
                showLogSetUI = false,
            )
            "PAUSE" -> _workoutState.value.copy(
                isWorkoutActive = true,
                isResting = true,
                restStartTime = now,
            )
            "END" -> WorkoutState()
            else -> return
        }

        withContext(Dispatchers.Main) {
            _workoutState.value = newState
            if (status == "START") startDisplayTimer()
            if (status == "END") stopDisplayTimer()
        }
        persistState(context.applicationContext, newState)
    }

    fun showLogSetUI() {
        _workoutState.value = _workoutState.value.copy(showLogSetUI = true)
    }

    fun hideLogSetUI() {
        _workoutState.value = _workoutState.value.copy(
            showLogSetUI = false,
            lastLoggedSetAt = System.currentTimeMillis(),
        )
    }

    private fun startDisplayTimer() {
        if (displayTimer != null) return
        displayTimer = Timer()
        displayTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                scope.launch(Dispatchers.Main) {
                    val now = System.currentTimeMillis()
                    val state = _workoutState.value
                    if (!state.isWorkoutActive) return@launch
                    _workoutState.value = state.copy(
                        displayExerciseSeconds = ((now - state.exerciseStartTime) / 1000).toInt()
                            .coerceAtLeast(0),
                        displayRestSeconds = if (state.isResting && state.restStartTime > 0)
                            ((now - state.restStartTime) / 1000).toInt().coerceAtLeast(0)
                        else 0,
                    )
                }
            }
        }, 0L, 500L)
    }

    private fun stopDisplayTimer() {
        displayTimer?.cancel()
        displayTimer = null
    }

    private suspend fun persistState(context: Context, state: WorkoutState) {
        context.wearDataStore.edit { prefs ->
            prefs[KEY_EXERCISE] = state.currentExercise
            prefs[KEY_ACTIVE] = state.isWorkoutActive
            prefs[KEY_RESTING] = state.isResting
            prefs[KEY_EXERCISE_START] = state.exerciseStartTime
            prefs[KEY_REST_START] = state.restStartTime
        }
    }

    fun formatTime(totalSeconds: Int): String {
        val minutes = totalSeconds / 60
        val secs = totalSeconds % 60
        return "%02d:%02d".format(minutes, secs)
    }
}
