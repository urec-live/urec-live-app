package com.ureclive.urecliveapp.wear.services

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMap
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService
import com.ureclive.urecliveapp.wear.WearRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class WearDataLayerListenerService : WearableListenerService() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        WearRepository.initialize(applicationContext)
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED) {
                scope.launch {
                    try {
                        val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                        handleWorkoutUpdate(dataMap)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }
    }

    private suspend fun handleWorkoutUpdate(dataMap: DataMap) {
        val data = mutableMapOf<String, Any>()
        dataMap.getString("status")?.let { data["status"] = it }
        dataMap.getString("exercise")?.let { data["exercise"] = it }
        dataMap.getString("code")?.let { data["code"] = it }
        val exerciseStart = dataMap.getLong("exerciseStartTime", 0L)
        if (exerciseStart > 0L) data["exerciseStartTime"] = exerciseStart
        val restStart = dataMap.getLong("restStartTime", 0L)
        data["restStartTime"] = restStart
        if (data.isNotEmpty()) {
            WearRepository.updateFromPhone(applicationContext, data)
        }
    }
}
