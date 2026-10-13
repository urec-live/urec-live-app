package com.ureclive.urecliveapp.wear.ui

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.material.*
import com.ureclive.urecliveapp.wear.WearRepository
import com.ureclive.urecliveapp.wear.WearViewModel
import com.ureclive.urecliveapp.wear.WorkoutState

private val GreenPrimary = Color(0xFF4CAF50)
private val YellowRest = Color(0xFFFFEB3B)
private val BackgroundDark = Color(0xFF121212)
private val TextPrimary = Color(0xFFFFFFFF)
private val ErrorRed = Color(0xFFE53935)

@Composable
fun WearApp(viewModel: WearViewModel) {
    val state by viewModel.workoutState.collectAsStateWithLifecycle()

    HapticOnSetLogged(state.lastLoggedSetAt)

    MaterialTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BackgroundDark),
        ) {
            when {
                state.showLogSetUI -> LogSetScreen(viewModel)
                state.isWorkoutActive -> WorkoutScreen(state, viewModel)
                else -> IdleScreen()
            }
        }
    }
}

@Composable
private fun HapticOnSetLogged(lastLoggedSetAt: Long) {
    val context = LocalContext.current
    LaunchedEffect(lastLoggedSetAt) {
        if (lastLoggedSetAt > 0) {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Vibrator::class.java)
            vibrator?.vibrate(
                VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE)
            )
        }
    }
}

@Composable
private fun IdleScreen() {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "💪",
            fontSize = 36.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Ready to sync",
            color = TextPrimary,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun WorkoutScreen(state: WorkoutState, viewModel: WearViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 8.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = state.currentExercise,
            color = GreenPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )

        Spacer(Modifier.height(4.dp))

        Text(
            text = WearRepository.formatTime(state.displayExerciseSeconds),
            color = TextPrimary,
            fontSize = 36.sp,
            fontFamily = FontFamily.Monospace,
            textAlign = TextAlign.Center,
        )

        if (state.isResting) {
            Text(
                text = "Rest  ${WearRepository.formatTime(state.displayRestSeconds)}",
                color = YellowRest,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(Modifier.height(12.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CompactChip(
                onClick = { viewModel.toggleRest() },
                label = {
                    Text(
                        text = if (state.isResting) "Resume" else "Rest",
                        fontSize = 10.sp,
                    )
                },
                colors = ChipDefaults.chipColors(backgroundColor = YellowRest.copy(alpha = 0.8f)),
            )
            CompactChip(
                onClick = { viewModel.showLogSetUI() },
                label = { Text("Log", fontSize = 10.sp) },
                colors = ChipDefaults.chipColors(backgroundColor = GreenPrimary.copy(alpha = 0.8f)),
            )
            CompactChip(
                onClick = { viewModel.endWorkout() },
                label = { Text("End", fontSize = 10.sp) },
                colors = ChipDefaults.chipColors(backgroundColor = ErrorRed.copy(alpha = 0.8f)),
            )
        }
    }
}

@Composable
private fun LogSetScreen(viewModel: WearViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 8.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Log Set",
            color = TextPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
        )

        Spacer(Modifier.height(8.dp))

        StepperRow(
            label = "Reps",
            value = viewModel.repCount,
            onDecrement = { viewModel.decrementReps() },
            onIncrement = { viewModel.incrementReps() },
        )

        Spacer(Modifier.height(4.dp))

        StepperRow(
            label = "lbs",
            value = viewModel.weightLbs,
            onDecrement = { viewModel.decrementWeight() },
            onIncrement = { viewModel.incrementWeight() },
        )

        Spacer(Modifier.height(12.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CompactChip(
                onClick = { viewModel.confirmLogSet() },
                label = { Text("OK", fontSize = 11.sp, color = TextPrimary) },
                colors = ChipDefaults.chipColors(backgroundColor = GreenPrimary),
            )
            CompactChip(
                onClick = { viewModel.cancelLogSet() },
                label = { Text("✕", fontSize = 11.sp, color = TextPrimary) },
                colors = ChipDefaults.chipColors(backgroundColor = ErrorRed),
            )
        }
    }
}

@Composable
private fun StepperRow(
    label: String,
    value: Int,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        CompactChip(
            onClick = onDecrement,
            label = { Text("−", fontSize = 14.sp) },
            modifier = Modifier.size(36.dp),
            colors = ChipDefaults.secondaryChipColors(),
        )
        Text(
            text = "$value $label",
            color = TextPrimary,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(min = 60.dp),
        )
        CompactChip(
            onClick = onIncrement,
            label = { Text("+", fontSize = 14.sp) },
            modifier = Modifier.size(36.dp),
            colors = ChipDefaults.secondaryChipColors(),
        )
    }
}
