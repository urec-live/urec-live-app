package com.ureclive.urecliveapp.wear.services

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
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
                        val data = mutableMapOf<String, Any>()
                        dataMap.keySet().forEach { key ->
                            val value = dataMap[key]
                            if (value != null) data[key] = value
                        }
                        WearRepository.updateFromPhone(applicationContext, data)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }
    }
}
