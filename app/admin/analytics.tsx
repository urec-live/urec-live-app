import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { adminAPI } from '../../services/adminAPI';
import { LineChart } from 'react-native-chart-kit';
import { ThemedView } from '@/components/themed-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function AnalyticsDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [bottlenecks, setBottlenecks] = useState<any[]>([]);
    const [trends, setTrends] = useState<Record<string, number>>({});
    const screenWidth = Dimensions.get("window").width;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [bneckData, trendData] = await Promise.all([
                adminAPI.getBottlenecks(7),
                adminAPI.getUtilizationTrends(7)
            ]);
            setBottlenecks(bneckData);
            setTrends(trendData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const chartData = {
        labels: Object.keys(trends).sort((a, b) => Number(a) - Number(b)).filter((_, i) => i % 3 === 0).map(h => `${h}:00`),
        datasets: [
            {
                data: Object.keys(trends).sort((a, b) => Number(a) - Number(b)).map(k => trends[k] || 0)
            }
        ]
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#666" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Capacity Planning</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Average Utilization Trends (Last 7 Days)</Text>
                    <Text style={styles.subtitle}>Occupancy % by Hour of Day</Text>
                    <LineChart
                        data={chartData}
                        width={screenWidth - 60}
                        height={220}
                        chartConfig={{
                            backgroundColor: "#ffffff",
                            backgroundGradientFrom: "#ffffff",
                            backgroundGradientTo: "#ffffff",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: {
                                borderRadius: 16
                            },
                            propsForDots: {
                                r: "4",
                                strokeWidth: "2",
                                stroke: "#2E7D32"
                            }
                        }}
                        bezier
                        style={{
                            marginVertical: 8,
                            borderRadius: 16
                        }}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Bottlenecks (Top 10)</Text>
                    <Text style={styles.subtitle}>Equipment with Highest Avg Wait / Usage Duration</Text>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHead, { flex: 2 }]}>Machine</Text>
                        <Text style={[styles.tableHead, { flex: 1, textAlign: 'right' }]}>Avg Wait</Text>
                        <Text style={[styles.tableHead, { flex: 1, textAlign: 'right' }]}>Avg Session</Text>
                    </View>

                    {bottlenecks.map((item, index) => (
                        <View key={item.equipmentId} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                            <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: '#F44336' }]}>
                                {item.estimatedWaitSeconds ? `${Math.ceil(item.estimatedWaitSeconds / 60)}m` : '0m'}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                                {item.averageDurationSeconds ? `${Math.ceil(item.averageDurationSeconds / 60)}m` : '-'}
                            </Text>
                        </View>
                    ))}

                    {bottlenecks.length === 0 && (
                        <Text style={{ textAlign: 'center', padding: 20, color: '#999' }}>No data available yet.</Text>
                    )}
                </View>

            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    backText: {
        fontSize: 16,
        color: '#666',
        marginLeft: 4,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
        marginBottom: 8,
    },
    tableHead: {
        fontSize: 12,
        color: '#999',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableRowAlt: {
        backgroundColor: '#fafafa',
    },
    tableCell: {
        fontSize: 14,
        color: '#333',
    },
});
