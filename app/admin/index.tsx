import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adminAPI, Machine } from '../../services/adminAPI';
import { userAPI } from '../../services/userAPI';
import { ThemedView } from '@/components/themed-view';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Colors } from '@/constants/theme';

interface UserResult {
    id: number;
    username: string;
    email: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        loadMachines();
    }, []);

    const loadMachines = async () => {
        try {
            setLoading(true);
            const data = await adminAPI.getAllMachines();
            setMachines(data);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: number, name: string) => {
        Alert.alert(
            'Delete Machine',
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminAPI.deleteMachine(id);
                            loadMachines(); // Reload list
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    },
                },
            ]
        );
    };

    const handleStatusUpdate = async (status: string) => {
        if (!selectedMachine) return;
        try {
            await adminAPI.updateMachineStatus(selectedMachine.id, status);
            setStatusModalVisible(false);
            loadMachines(); // Refresh list to show new status
        } catch (error: any) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const csvData = await adminAPI.exportSessions();

            // Ask user for preference
            Alert.alert(
                'Export Ready',
                'How would you like to export the file?',
                [
                    {
                        text: 'Share',
                        onPress: async () => await shareFile(csvData)
                    },
                    {
                        text: 'Save to Device',
                        onPress: async () => await saveToDevice(csvData)
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error: any) {
            console.error(error);
            Alert.alert('Export Failed', 'Could not export data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const shareFile = async (data: string) => {
        const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + 'equipment_sessions.csv';
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: 'utf8' });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Equipment Sessions'
            });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
        }
    };

    const saveToDevice = async (data: string) => {
        try {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    'equipment_sessions.csv',
                    'text/csv'
                );
                await FileSystem.writeAsStringAsync(uri, data, { encoding: 'utf8' });
                Alert.alert('Success', 'File saved successfully!');
            } else {
                // User cancelled or denied
            }
        } catch (e: any) {
            Alert.alert('Error', 'Failed to save file: ' + e.message);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setSearchLoading(true);
            const results = await userAPI.searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchLoading(false);
        }
    };

    const openStatusModal = (machine: Machine) => {
        setSelectedMachine(machine);
        setStatusModalVisible(true);
    };

    const renderItem = ({ item }: { item: Machine }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <Text style={styles.machineName}>{item.name}</Text>
                <Text style={styles.machineCode}>{item.code}</Text>
                <Pressable onPress={() => openStatusModal(item)}>
                    <Text style={[styles.statusBadget, {
                        color: item.status === 'AVAILABLE' ? '#4CAF50' :
                            item.status === 'IN_USE' ? '#FFC107' : '#F44336'
                    }]}>
                        {item.status} <MaterialCommunityIcons name="chevron-down" size={12} />
                    </Text>
                </Pressable>
            </View>
            <View style={styles.actions}>
                <Pressable
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/admin/edit', params: { id: item.id } })}
                >
                    <MaterialCommunityIcons name="pencil" size={20} color={Colors.light.primary} />
                </Pressable>
                <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <MaterialCommunityIcons name="delete" size={20} color="#ff4444" />
                </Pressable>
            </View>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Admin Dashboard</Text>
                <Pressable style={styles.addButton} onPress={() => router.push('/admin/create')}>
                    <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                    <Text style={styles.addButtonText}>Add New</Text>
                </Pressable>
            </View>

            <View style={{ marginBottom: 20, flexDirection: 'row', gap: 10 }}>
                <Pressable
                    style={[styles.addButton, { backgroundColor: '#2196F3', alignSelf: 'flex-start' }]}
                    onPress={handleExport}
                >
                    <MaterialCommunityIcons name="download" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Export Data</Text>
                </Pressable>
                <Pressable
                    style={[styles.addButton, { backgroundColor: '#9C27B0', alignSelf: 'flex-start' }]}
                    onPress={() => router.push('/admin/analytics')}
                >
                    <MaterialCommunityIcons name="chart-bar" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Analytics</Text>
                </Pressable>
            </View>

            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="account-search" size={20} color="#666" />
                <Text style={styles.sectionTitle}>User Search</Text>
            </View>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search username or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                <Pressable style={styles.searchButton} onPress={handleSearch}>
                    {searchLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
                    )}
                </Pressable>
            </View>

            {
                searchResults.length > 0 && (
                    <View style={styles.resultsList}>
                        {searchResults.map(user => (
                            <View key={user.id} style={styles.userRow}>
                                <Text style={styles.username}>{user.username}</Text>
                                <Text style={styles.email}>{user.email}</Text>
                            </View>
                        ))}
                    </View>
                )
            }

            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="#666" />
                <Text style={styles.sectionTitle}>Equipment</Text>
            </View>

            {
                loading ? (
                    <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={machines}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>No machines found.</Text>}
                    />
                )
            }

            <Modal visible={statusModalVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Status: {selectedMachine?.name}</Text>
                        {['AVAILABLE', 'MAINTENANCE', 'BROKEN', 'RESERVED'].map(status => (
                            <Pressable
                                key={status}
                                style={styles.modalOption}
                                onPress={() => handleStatusUpdate(status)}
                            >
                                <Text style={styles.optionText}>{status}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </ThemedView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
        backgroundColor: Colors.light.backgroundSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.light.text,
        letterSpacing: -0.5,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.light.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        backgroundColor: Colors.light.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 0,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchButton: {
        backgroundColor: Colors.light.primary,
        padding: 12,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    resultsList: {
        backgroundColor: Colors.light.surface,
        borderRadius: 16,
        padding: 10,
        marginBottom: 20,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    userRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.secondary,
    },
    username: {
        fontWeight: '700',
        color: Colors.light.text,
    },
    email: {
        color: Colors.light.textSecondary,
        fontSize: 12,
    },
    addButton: {
        backgroundColor: Colors.light.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    list: {
        paddingBottom: 100,
    },
    card: {
        backgroundColor: Colors.light.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardContent: {
        flex: 1,
    },
    machineName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 4,
    },
    machineCode: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginBottom: 8,
    },
    statusBadget: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '700',
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: Colors.light.backgroundSecondary,
        alignSelf: 'flex-start',
        borderRadius: 8,
        overflow: 'hidden',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 10,
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.light.textSecondary,
        marginTop: 40,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: Colors.light.surface,
        width: '85%',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 20,
        textAlign: 'center',
        color: Colors.light.text,
    },
    modalOption: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.secondary,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
});
