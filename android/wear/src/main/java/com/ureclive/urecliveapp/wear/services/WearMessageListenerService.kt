package com.ureclive.urecliveapp.wear.services

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.ureclive.urecliveapp.wear.WearRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject

class WearMessageListenerService : WearableListenerService() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        // Ensure repository is ready even if service starts before the activity.
        WearRepository.initialize(applicationContext)
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        super.onMessageReceived(messageEvent)
        scope.launch {
            try {
                // react-native-wear-connectivity sends the JSON payload as the
                // Wearable message path (not as data). Parse it accordingly.
                val json = JSONObject(messageEvent.path)
                val dataMap = mutableMapOf<String, Any>()
                val keys = json.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    dataMap[key] = json.get(key)
                }
                WearRepository.updateFromPhone(applicationContext, dataMap)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
