import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '@/contexts/OfflineContext';

export default function OfflineBanner() {
    const { isConnected } = useOffline();
    const insets = useSafeAreaInsets();

    if (isConnected !== false) {
        return null;
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
            <Text style={styles.text}>You are offline</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#333333',
        paddingTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    text: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});
