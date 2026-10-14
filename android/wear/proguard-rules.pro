# Preserve Jetpack Compose
-keep @androidx.compose.runtime.Composable class **
-keepclasseswithmembers class * {
    @androidx.compose.runtime.Composable <methods>;
}

# Preserve Wear OS
-keep class androidx.wear.** { *; }

# Preserve Play Services Wearable
-keep class com.google.android.gms.wearable.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enum values
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Kotlin serialization
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembernames class * {
    native <methods>;
}
