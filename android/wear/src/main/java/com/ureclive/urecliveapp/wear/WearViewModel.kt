package com.ureclive.urecliveapp.wear

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class WearViewModel(app: Application) : AndroidViewModel(app) {

    init {
        WearRepository.initialize(app)
    }

    val workoutState = WearRepository.workoutState

    var repCount by mutableStateOf(10)
        private set
    var weightLbs by mutableStateOf(135)
        private set

    private val msgClient by lazy { MessageClientManager(getApplication()) }

    fun incrementReps() { repCount = (repCount + 1).coerceAtMost(100) }
    fun decrementReps() { repCount = (repCount - 1).coerceAtLeast(1) }
    fun incrementWeight() { weightLbs = (weightLbs + 5).coerceAtMost(500) }
    fun decrementWeight() { weightLbs = (weightLbs - 5).coerceAtLeast(5) }

    fun showLogSetUI() = WearRepository.showLogSetUI()
    fun cancelLogSet() = WearRepository.hideLogSetUI()

    fun confirmLogSet() {
        viewModelScope.launch {
            msgClient.logSet(repCount, weightLbs.toDouble())
            WearRepository.hideLogSetUI()
        }
    }

    fun toggleRest() {
        viewModelScope.launch {
            msgClient.toggleRest(workoutState.value)
        }
    }

    fun endWorkout() {
        viewModelScope.launch {
            msgClient.endWorkout()
        }
    }
}
